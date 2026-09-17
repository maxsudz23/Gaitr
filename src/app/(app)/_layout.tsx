// Layout for the authenticated part of the app. Rendering the tab navigator
// here (rather than at the root) means the tabs only exist once a user is
// signed in; the root Stack guards this whole group behind a session.
import AppTabs from '@/components/app-tabs';

export default function AppLayout() {
  return <AppTabs />;
}
