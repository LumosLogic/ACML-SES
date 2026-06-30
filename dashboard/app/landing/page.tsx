"use client"

import Link from "next/link"
import { useState } from "react"
import {
  Mail, Zap, BarChart3, Shield, Globe,
  ArrowRight, Server, Clock, Key,
  Users, TrendingUp, ChevronRight, Menu, X,
} from "lucide-react"

// ─── Data ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: "Multi-Client Management",
    desc: "Onboard multiple clients with isolated API keys, custom domains, and per-client daily send quotas.",
    color: "bg-indigo-500/10 text-indigo-400",
  },
  {
    icon: Zap,
    title: "Bulk Email Queue",
    desc: "Send to thousands of recipients with BullMQ-backed queuing, real-time progress, and automatic retries.",
    color: "bg-amber-500/10 text-amber-400",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Track delivery rates, bounces, and opens with live charts and customisable date ranges.",
    color: "bg-emerald-500/10 text-emerald-400",
  },
  {
    icon: Globe,
    title: "Custom SMTP Support",
    desc: "Use shared AWS SES or configure per-client SMTP credentials and SES configuration sets.",
    color: "bg-violet-500/10 text-violet-400",
  },
  {
    icon: Shield,
    title: "Suppression Management",
    desc: "Automatic bounce and complaint handling with a global suppression list to protect your sender reputation.",
    color: "bg-red-500/10 text-red-400",
  },
  {
    icon: Clock,
    title: "Scheduled Sending",
    desc: "Schedule emails for future delivery with precise timing control via the send_at parameter.",
    color: "bg-cyan-500/10 text-cyan-400",
  },
]

const steps = [
  {
    icon: Key,
    title: "Configure Your Client",
    desc: "Create a client with your domain, SMTP settings, and daily send quota through the admin dashboard.",
  },
  {
    icon: Mail,
    title: "Send via API",
    desc: "Use your API key to send single or bulk emails — CSV upload, JSON recipients, or plain addresses.",
  },
  {
    icon: BarChart3,
    title: "Track & Analyse",
    desc: "Monitor delivery rates, bounces, and queue status in real time through the analytics dashboard.",
  },
]

const bigStats = [
  { value: "50k", label: "Daily Send Quota",  icon: Mail,        color: "bg-indigo-500/10 text-indigo-400" },
  { value: "14/s", label: "Max Send Rate",    icon: Zap,         color: "bg-amber-500/10  text-amber-400"  },
  { value: "99%+", label: "Delivery Rate",    icon: TrendingUp,  color: "bg-emerald-500/10 text-emerald-400" },
  { value: "∞",    label: "Queue Capacity",   icon: Server,      color: "bg-violet-500/10 text-violet-400" },
]

const heroStats = [
  { value: "50k",  label: "Emails / Day", icon: Mail },
  { value: "14/s", label: "Send Rate",    icon: Zap },
  { value: "99%+", label: "Delivery",     icon: TrendingUp },
]

// ─── Page ──────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-base tracking-tight">ACML SES</span>
            </div>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features"     className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-slate-400 hover:text-white transition-colors">How It Works</a>
              <a href="#stats"        className="text-sm text-slate-400 hover:text-white transition-colors">Stats</a>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {/* Hamburger — mobile only */}
              <button
                onClick={() => setMobileMenuOpen(o => !o)}
                className="md:hidden p-2 ml-1 text-slate-400 hover:text-white transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-slate-800 py-3 space-y-0.5">
              {[
                { label: "Features",     href: "#features" },
                { label: "How It Works", href: "#how-it-works" },
                { label: "Stats",        href: "#stats" },
                { label: "Sign In",      href: "/login" },
              ].map(({ label, href }) => (
                <a
                  key={label}
                  href={href}
                  className="block px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </a>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-24 left-1/4  w-[300px] h-[300px] bg-violet-600/8  rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-16 right-1/4 w-[250px] h-[250px] bg-indigo-400/6  rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Zap className="h-3 w-3" />
            Powered by AWS SES
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            Send Emails at Scale,
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">
              With Confidence
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Managed AWS SES infrastructure with per-client quotas, real-time analytics,
            bulk email queuing, and enterprise-grade delivery. Built for teams that need
            reliable email at scale.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Sign In to Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Explore Features <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto sm:max-w-lg">
            {heroStats.map(({ value, label, icon: Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-4 sm:px-4"
              >
                <Icon className="h-4 w-4 text-indigo-400 mb-0.5" />
                <span className="text-xl sm:text-2xl font-bold text-white">{value}</span>
                <span className="text-[11px] sm:text-xs text-slate-500 text-center">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to send at scale
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
              A complete email infrastructure platform built on AWS SES with enterprise-grade
              features — from suppression lists to webhook event tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-xl p-6 transition-colors group"
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-slate-900/40 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Up and running in minutes</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
              Get your email infrastructure configured and sending in three simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Connector line — desktop only */}
            <div className="hidden md:block absolute top-8 left-[calc(33%+2rem)] right-[calc(33%+2rem)] h-px bg-gradient-to-r from-indigo-500/40 via-violet-500/20 to-indigo-500/40" />

            {steps.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="relative flex flex-col items-center text-center px-4 py-6">
                <div className="relative h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-5 shrink-0">
                  <Icon className="h-7 w-7 text-indigo-400" />
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-indigo-600 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section id="stats" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Built for performance</h2>
            <p className="text-slate-400 text-sm sm:text-base">Numbers that define our platform capabilities.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {bigStats.map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-xl mb-3 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{value}</div>
                <div className="text-xs sm:text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-800/60">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-slate-900/0 border border-indigo-500/20 rounded-2xl px-6 py-14 sm:px-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/20 mb-6">
            <Mail className="h-7 w-7 text-indigo-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to start sending?</h2>
          <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
            Sign in to your dashboard and start sending with enterprise-grade email infrastructure.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-sm"
          >
            Sign In to Dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-indigo-600 rounded-md flex items-center justify-center">
              <Mail className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">ACML SES</span>
          </div>

          <p className="text-xs text-slate-600 order-last sm:order-none">
            © {new Date().getFullYear()} ACML. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <Link href="/login"   className="text-xs text-slate-500 hover:text-white transition-colors">Sign In</Link>
            <a href="#features"   className="text-xs text-slate-500 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-xs text-slate-500 hover:text-white transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
