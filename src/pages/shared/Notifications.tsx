import { useNavigate } from 'react-router-dom'
import { Button, Empty, PageHeader, Panel } from '../../components/kit'
import type { Role } from '../../data/market'
import { useStore } from '../../data/store'
import { cx, timeAgo } from '../../lib/format'

export default function Notifications({ role }: { role: Role }) {
  const { state, markRead, markAllRead } = useStore()
  const navigate = useNavigate()
  const list = state.notifications.filter(n => n.to === role)
  const unread = list.filter(n => !n.read).length

  return (
    <>
      <PageHeader title="Notifications" subtitle="Everything that needs your attention."
        actions={unread > 0 && <Button variant="secondary" onClick={() => markAllRead()}>Mark all as read</Button>} />
      <Panel pad={false}>
        {list.length === 0 ? <Empty text="No notifications yet." /> : list.map(n => (
          <button key={n.id} onClick={() => { markRead(n.id); navigate(n.link) }}
            className="flex w-full items-start gap-3 border-b border-line px-5 py-4 text-left last:border-0 hover:bg-subtle">
            <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} aria-label={n.read ? undefined : 'Unread'} />
            <div className="min-w-0 flex-1">
              <div className={cx('text-[14px]', n.read ? 'text-fg-2' : 'font-medium text-fg')}>{n.title}</div>
              <div className="mt-0.5 text-[13px] text-muted">{n.body}</div>
            </div>
            <span className="shrink-0 text-[12px] text-faint">{timeAgo(n.at)}</span>
          </button>
        ))}
      </Panel>
    </>
  )
}
