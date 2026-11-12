import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import page from './Page.module.scss';

export default function NotFoundPage() {
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
