import { Link } from 'react-router';
import { Compass } from '@/components/ui/icons';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { TITLE_LEVEL, usePageTitle } from '@/utils/usePageTitle';
import page from './Page.module.scss';

export default function NotFoundPage() {
  usePageTitle('Page introuvable', TITLE_LEVEL.page);
  return (
    <>
      <AppHeader />
      <main className={page.narrow}>
        <EmptyState icon={Compass} title="Page introuvable" action={<Button as={Link} to="/" variant="primary">Retour aux univers</Button>}>
          Cette page n’existe pas (ou pas encore).
        </EmptyState>
      </main>
    </>
  );
}
