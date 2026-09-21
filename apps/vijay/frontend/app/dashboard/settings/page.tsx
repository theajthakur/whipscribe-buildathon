"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { UserButton, useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import {
  ArrowLeft,
  DollarSign,
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  Calculator,
  Loader2,
  Sparkles,
  HelpCircle,
} from "lucide-react"

export default function SettingsPage() {
  const { userId } = useAuth()
  const [hourlyRate, setHourlyRate] = useState<number>(100)
  const [currency, setCurrency] = useState<string>("USD")
  const [messageTone, setMessageTone] = useState<string>("friendly and professional")

  const [testHours, setTestHours] = useState<number>(10)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  // Exponential conversion helpers: 0-100% slider position <-> Exponential value [minVal, maxVal]
  const percentToExp = (pct: number, minVal = 5, maxVal = 500) => {
    const factor = Math.log10(maxVal / minVal)
    const val = minVal * Math.pow(10, (pct / 100) * factor)
    if (val < 20) return Math.round(val)
    if (val < 100) return Math.round(val / 5) * 5
    return Math.round(val / 10) * 10
  }

  const expToPercent = (val: number, minVal = 5, maxVal = 500) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val))
    const factor = Math.log10(maxVal / minVal)
    return (Math.log10(clamped / minVal) / factor) * 100
  }

  useEffect(() => {
    async function loadSettings() {
      try {
        api.setUserId(userId || null)
        const data = await api.getUserSettings()
        if (data) {
          if (data.hourly_rate !== undefined) setHourlyRate(data.hourly_rate)
          if (data.currency) setCurrency(data.currency)
          if (data.message_tone) setMessageTone(data.message_tone)
        }
      } catch (err) {
        console.error("Failed to load user settings", err)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [userId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      api.setUserId(userId || null)
      await api.updateUserSettings(hourlyRate, currency, messageTone)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error("Failed to save settings", err)
    } finally {
      setSaving(false)
    }
  }

  const currencySymbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    INR: "₹",
    GBP: "£",
  }

  const symbol = currencySymbols[currency] || "$"
  const calculatedTotal = (hourlyRate || 0) * testHours

  return (
    <div className="h-screen w-screen max-w-full bg-background text-foreground flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1 py-1 px-2.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Workspace
          </Link>
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <SettingsIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <h1 className="font-display font-bold text-sm text-foreground tracking-tight">
              Freelancer Settings
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <UserButton />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-xs font-mono">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            Loading settings...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Page Header Title */}
            <div>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-foreground">
                Rates & Billing Configuration
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Configure your hourly rate and billing currency. When CallBrief processes client call transcripts, it calculates project quotes automatically based on your price per hour.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Settings Form */}
              <form onSubmit={handleSave} className="lg:col-span-7 space-y-5 bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="space-y-1 pb-3 border-b border-border">
                  <h3 className="font-display font-semibold text-sm text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" /> Billing Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Set your default pricing parameters used for generating AI call quotes.
                  </p>
                </div>

                {/* Hourly Rate Input & Exponential Slider ($5 to $500 / hr) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <label htmlFor="hourlyRate">Hourly Rate ({symbol}/hour)</label>
                    <span className="font-mono text-primary font-bold text-sm">{symbol}{hourlyRate}/hr</span>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={expToPercent(hourlyRate, 5, 500)}
                      onChange={(e) => setHourlyRate(percentToExp(parseFloat(e.target.value), 5, 500))}
                      className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{symbol}5/hr (min)</span>
                      <span>Exponential 5–500</span>
                      <span>{symbol}500/hr (max)</span>
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                      {symbol}
                    </span>
                    <input
                      id="hourlyRate"
                      type="number"
                      min="5"
                      max="500"
                      step="1"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Math.max(5, Math.min(500, parseFloat(e.target.value) || 5)))}
                      className="w-full bg-background border border-border rounded-lg py-2 pl-8 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="100"
                    />
                  </div>
                </div>

                {/* Currency Selection */}
                <div className="space-y-2">
                  <label htmlFor="currency" className="text-xs font-semibold text-foreground">
                    Currency Symbol
                  </label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                  </select>
                </div>

                {/* Client Message Tone */}
                <div className="space-y-2">
                  <label htmlFor="messageTone" className="text-xs font-semibold text-foreground">
                    Client Confirmation Message Tone
                  </label>
                  <select
                    id="messageTone"
                    value={messageTone}
                    onChange={(e) => setMessageTone(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="friendly and professional">Friendly & Professional (Recommended)</option>
                    <option value="formal and concise">Formal & Concise</option>
                    <option value="direct and casual">Direct & Casual</option>
                  </select>
                </div>

                {/* Save Button */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                    {savedSuccess && (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Settings updated!
                      </>
                    )}
                  </span>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Settings
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Live Cost Calculation Interactive Simulator */}
              <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <Calculator className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-semibold text-sm text-foreground">
                      Live Cost Calculator
                    </h3>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                    Test how CallBrief will calculate total project quotes when tasks are extracted from audio calls.
                  </p>

                  <div className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono">User Rate:</span>
                      <span className="font-mono font-bold text-foreground">{symbol}{hourlyRate}/hr</span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground font-mono">Expected Work Hours:</span>
                        <span className="font-mono font-bold text-primary">{testHours} hours</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={expToPercent(testHours, 5, 500)}
                        onChange={(e) => setTestHours(percentToExp(parseFloat(e.target.value), 5, 500))}
                        className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>5h</span>
                        <span>Exponential 5–500h</span>
                        <span>500h</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-primary/20 flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Calculated Quote:
                      </span>
                      <span className="font-mono text-base font-extrabold text-primary">
                        {symbol}{calculatedTotal.toLocaleString()} {currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
