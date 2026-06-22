export interface Draw {
  id: string
  draw_date: string
  status: 'open' | 'closed' | 'completed'
  entry_deadline: string
  created_at: string
}
