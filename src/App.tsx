import { useRoute } from './lib/router'
import { Home } from './pages/Home'
import { MatchPage } from './pages/MatchPage'
import { TeamPage } from './pages/TeamPage'

export default function App() {
  const r = useRoute()
  if (r.page === 'match') return <MatchPage id={r.id} />
  if (r.page === 'team') return <TeamPage id={r.id} />
  return <Home />
}
