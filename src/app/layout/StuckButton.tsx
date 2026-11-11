import { useNavigate } from 'react-router';
import { stuckButton } from '../../copy/home';
import { Button } from '../components/Button';

export function StuckButton({ variant = 'quiet' }: { variant?: 'primary' | 'quiet' }) {
  const navigate = useNavigate();
  return (
    <Button variant={variant} onClick={() => void navigate('/stuck')}>
      {stuckButton}
    </Button>
  );
}
