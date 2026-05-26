interface Props {
  title: string
  description: string
}

/**
 * 占位页 · design.md §4 (coming-soon stripe)
 * 虚线边 + tag + 衬线大字 + 描述
 */
export default function ComingSoon({ title, description }: Props) {
  return (
    <div className="px-[var(--pad-x)] pt-7 pb-24 min-w-0">
      <div className="flex items-end justify-between gap-[18px] mb-[22px]">
        <div>
          <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-[var(--muted)] mb-2">
            Editorial · {title}
          </div>
          <h1 className="font-serif font-normal text-[44px] leading-[1.05] tracking-[-0.015em] m-0">
            <em className="italic text-[var(--accent)]">{title}</em>
          </h1>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 border border-dashed border-[var(--hairline-2)] rounded-[4px] bg-[var(--surface)] px-[30px] py-[40px] text-center">
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--accent)] bg-[var(--accent-soft)] px-2 py-1 rounded-[2px]">
          coming next
        </span>
        <h2 className="font-serif font-normal text-[28px] m-0">{title}</h2>
        <p className="text-[var(--muted)] text-[13px] m-0 max-w-[44ch]">{description}</p>
      </div>
    </div>
  )
}
