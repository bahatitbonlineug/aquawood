import { motion } from 'framer-motion';
import { Cog, RefreshCw, LogOut, AlertTriangle, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function MaintenanceScreen() {
  const handleRetry = () => window.location.reload();
  const handleLogout = () => base44.auth.logout();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 overflow-hidden relative">
      {/* Animated background glow blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl"
        animate={{ scale: [1.3, 1, 1.3], opacity: [0.2, 0.1, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-3xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 text-center px-6 max-w-lg">
        {/* Spinning gears cluster */}
        <div className="relative flex items-center justify-center mb-10 h-36">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="relative z-20"
          >
            <Cog className="h-24 w-24 text-emerald-400/70" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            className="absolute z-10"
            style={{ right: '18%', top: '5%' }}
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            <Cog className="h-14 w-14 text-sky-400/60" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            className="absolute z-30"
            style={{ left: '12%', bottom: '0%' }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <Cog className="h-10 w-10 text-emerald-300/50" strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Alert badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium mb-6"
        >
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
          </motion.span>
          System Under Maintenance
        </motion.div>

        {/* Main message */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold text-white font-display mb-3 tracking-tight"
        >
          The Engine Can't Be Reached Now
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-white/70 text-lg font-medium mb-2"
        >
          Try again later
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-white/40 text-sm mb-8 leading-relaxed"
        >
          Our team is performing scheduled maintenance to bring you a better experience.
          We'll be back shortly — thank you for your patience.
        </motion.p>

        {/* Pulsing status dots */}
        <div className="flex items-center justify-center gap-1.5 mb-8">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-emerald-400"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.7, 1.3, 0.7] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex items-center justify-center gap-3"
        >
          <Button
            onClick={handleRetry}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white gap-2 rounded-xl"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="text-white/25 text-[11px] mt-10 flex items-center justify-center gap-1.5"
        >
          <Wrench className="h-3 w-3" />
          AQUAWOOD Group Uganda Limited
        </motion.p>
      </div>
    </div>
  );
}