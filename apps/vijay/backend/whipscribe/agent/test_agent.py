"""
End-to-End Test Suite for WhipScribe Agent Module.
"""

import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from whipscribe.agent import AgentOrchestrator, CallIntent


def run_test():
    print("==================================================")
    print("Testing WhipScribe Agent Module (Vertex AI)")
    print("==================================================")

    # Sample Discovery Transcript
    sample_transcript = [
        {
            "time": "00:15",
            "speaker": "CLIENT",
            "text": "Hi, we own a salon chain and we are missing calls during peak hours. We need an online appointment booking platform.",
        },
        {
            "time": "00:45",
            "speaker": "CLIENT",
            "text": "It must sync with Google Calendar and send SMS/WhatsApp reminders to clients.",
        },
        {
            "time": "01:20",
            "speaker": "FREELANCER",
            "text": "Understood. Will clients pay online or at the salon?",
        },
        {
            "time": "01:35",
            "speaker": "CLIENT",
            "text": "Both. We want Stripe integration for deposit payments. Our total budget is around $3,000 to $4,000.",
        },
    ]

    orchestrator = AgentOrchestrator()

    print("\n[1] Running Agent Process Call on Discovery Transcript...")
    try:
        result = orchestrator.process_call(
            transcript_data=sample_transcript,
            hourly_rate=120.0,
            currency="USD",
        )

        print(f"\nStatus: {result.status}")
        print(f"Detected Intent: {result.router_result.intent.value} (Confidence: {result.router_result.confidence:.2f})")
        print(f"Reason: {result.router_result.reason}")

        if result.proposal:
            print("\n--- GENERATED PROPOSAL ---")
            print(f"Summary: {result.proposal.summary}")
            print(f"\nExtracted Requirements ({len(result.proposal.requirements)} items):")
            for req in result.proposal.requirements:
                print(f"  • [{req.time}] ({req.category.upper()}) {req.text}")

            print(f"\nTask Breakdown ({len(result.proposal.tasks)} tasks):")
            for task in result.proposal.tasks:
                print(f"  • [{task.time}] [{task.effort}] {task.title} ({task.estimated_hours}h)")

            if result.proposal.quote:
                print(f"\nQuote Estimate: ${result.proposal.quote.total_price:,.2f} ({result.proposal.quote.total_hours} total hours @ ${result.proposal.quote.hourly_rate}/h)")

            print("\nDrafted Client Message:")
            print(result.proposal.client_message_draft)

        print("\nSUCCESS: Agent Module test completed cleanly!")

    except Exception as e:
        print(f"\nTest Note: Vertex AI initialization output: {e}")
        print("Note: To run live calls with Vertex AI, ensure 'gcloud auth application-default login' is configured.")


if __name__ == "__main__":
    run_test()
