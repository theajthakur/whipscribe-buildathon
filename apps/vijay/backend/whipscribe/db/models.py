"""
SQLAlchemy ORM Models for WhipScribe CallBrief Backend.
Includes schemas for Users (Clerk Webhook sync), Settings, Submissions,
Clients, Projects, Calls, Items, Confirmations, and Agent Runs.
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
)
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    """Stores user accounts synced from Clerk webhooks."""
    __tablename__ = "users"

    id = Column(String, primary_key=True)  # Clerk User ID e.g. "user_2..."
    email = Column(String, unique=True, nullable=False, index=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    settings = relationship("Settings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    submissions = relationship("UserSubmission", back_populates="user", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="user", cascade="all, delete-orphan")


class Settings(Base):
    """User preferences (hourly rate, currency, message tone). One row per user."""
    __tablename__ = "settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    hourly_rate = Column(Float, default=100.0)
    currency = Column(String, default="USD")
    message_tone = Column(String, default="friendly and professional")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="settings")


class UserSubmission(Base):
    """Stores user audio file / audio URL / WhatsApp chat submissions."""
    __tablename__ = "user_submissions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String, nullable=False)  # 'audio_file' | 'audio_url' | 'whatsapp_export'
    source_location = Column(String, nullable=False)
    transcript_job_id = Column(String, nullable=True)
    status = Column(String, default="pending")  # 'pending' | 'transcribing' | 'completed' | 'failed'
    transcript_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="submissions")
    calls = relationship("Call", back_populates="submission")


class Client(Base):
    """Freelancer client records."""
    __tablename__ = "clients"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    whatsapp_number = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="clients")
    projects = relationship("Project", back_populates="client", cascade="all, delete-orphan")


class Project(Base):
    """Projects associated with a client."""
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id = Column(String, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    status = Column(String, default="active")  # 'active' | 'completed' | 'on_hold'
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="projects")
    calls = relationship("Call", back_populates="project")


class Call(Base):
    """Uploads (call, voice note, WhatsApp export) and intent classification results."""
    __tablename__ = "calls"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    user_submission_id = Column(String, ForeignKey("user_submissions.id", ondelete="SET NULL"), nullable=True)
    file_type = Column(String, default="call_recording")  # 'call_recording' | 'voice_note' | 'whatsapp_export'
    transcript_text = Column(Text, nullable=True)
    transcript_data = Column(JSON, nullable=True)
    detected_intent = Column(String, nullable=True)  # 'discovery' | 'inquiry' | 'change_request' | 'other'
    confidence = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="calls")
    submission = relationship("UserSubmission", back_populates="calls")
    items = relationship("Item", back_populates="call", cascade="all, delete-orphan")
    confirmations = relationship("Confirmation", back_populates="call", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="call")


class Item(Base):
    """Agent output items (tasks, features, questions, quotes) preserving original vs edited text."""
    __tablename__ = "items"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)  # 'requirement' | 'task' | 'question' | 'quote' | 'message'
    text = Column(Text, nullable=False)  # Current editable text
    original_agent_text = Column(Text, nullable=False)  # Unedited original agent output
    timestamp_link = Column(String, nullable=True)  # e.g. "01:24"
    status = Column(String, default="proposed")  # 'proposed' | 'edited' | 'approved' | 'deleted'
    effort = Column(String, nullable=True)  # 'S' | 'M' | 'L'
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="items")


class Confirmation(Base):
    """Scope confirmation messages and client responses for dispute prevention."""
    __tablename__ = "confirmations"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String, ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    proposed_scope_message = Column(Text, nullable=False)
    client_reply_text = Column(Text, nullable=True)
    status = Column(String, default="pending_client_approval")  # 'pending_client_approval' | 'approved' | 'disputed'
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="confirmations")


class AgentRun(Base):
    """Audit log of agent execution runs and tool calls."""
    __tablename__ = "agent_runs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String, ForeignKey("calls.id", ondelete="SET NULL"), nullable=True)
    intent = Column(String, nullable=False)
    tools_called = Column(JSON, nullable=True)
    logs = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    call = relationship("Call", back_populates="agent_runs")
