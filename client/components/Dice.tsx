import { useEffect, useState } from 'react'

export default function Dice({ rolling, last }: { rolling: boolean; last?: number | null }) {
  const [display, setDisplay] = useState<number | null>(null)

  useEffect(() => {
    let id: number | null = null
    if (rolling) {
      id = window.setInterval(() => {
        setDisplay(1 + Math.floor(Math.random() * 6))
      }, 80)
    } else {
      setDisplay(last ?? null)
    }
    return () => { if (id) clearInterval(id) }
  }, [rolling, last])

  return (
    <div className="flex items-center gap-2">
      <div className="w-11 h-11 flex items-center justify-center rounded-md bg-white shadow font-semibold">
        {display ?? '-'}
      </div>
      <div className="text-sm text-slate-600">Dice</div>
    </div>
  )
}
