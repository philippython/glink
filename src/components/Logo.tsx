import { motion } from 'framer-motion'

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <div className="relative grid place-items-center rounded-[10px] bg-ink-800 ring-1 ring-white/10" style={{ width: size, height: size }}>
      <svg viewBox="0 0 32 32" width={size * 0.8} height={size * 0.8}>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--g0)" />
            <stop offset="1" stopColor="var(--g7)" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="16" cy="16" r="10" fill="none" stroke="url(#lg)" strokeWidth="3.2" strokeLinecap="round"
          strokeDasharray="52 12"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          style={{ originX: '16px', originY: '16px' }}
        />
        <circle cx="16" cy="16" r="3" fill="var(--g2)" />
      </svg>
    </div>
  )
}
