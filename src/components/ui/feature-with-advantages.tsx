import React from 'react'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * The actual “feature” block you showed me.
 */
export function Feature() {
  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex gap-4 py-20 lg:py-40 flex-col items-start">
          <div><Badge>Platform</Badge></div>
          <div className="flex flex-col gap-2">
            <h2 className="text-3xl md:text-5xl tracking-tighter lg:max-w-xl font-regular">
              Something new!
            </h2>
            <p className="text-lg max-w-xl leading-relaxed tracking-tight text-muted-foreground">
              Managing a small business today is already tough.
            </p>
          </div>
          <div className="flex flex-col gap-10 pt-12 w-full">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-10">
              {[
                ["Easy to use", "We’ve made it easy to use and understand."],
                ["Fast and reliable", "We’ve made it fast and reliable."],
                ["Beautiful and modern", "We’ve made it beautiful and modern."],
                ["Easy to use", "We’ve made it easy to use and understand."],
                ["Fast and reliable", "We’ve made it fast and reliable."],
                ["Beautiful and modern", "We’ve made it beautiful and modern."],
              ].map(([title, desc], i) => (
                <div key={i} className="flex gap-6 items-start">
                  <Check className="w-4 h-4 mt-2 text-primary" />
                  <div className="flex flex-col gap-1">
                    <p>{title}</p>
                    <p className="text-muted-foreground text-sm">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A tiny wrapper that your Industry page will render.
 */
export function FeatureDemo() {
  return (
    <div className="block">
      <Feature />
    </div>
  )
}
