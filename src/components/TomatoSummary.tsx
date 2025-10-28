import { usePresenterData } from '../context/PresenterDataContext';

export default function TomatoSummary() {
  const { totalTomatoes } = usePresenterData();
  const count = Number.isFinite(totalTomatoes) ? totalTomatoes : 0;
  const formatted = count.toLocaleString();
  const pluralSuffix = count === 1 ? '' : 's';
  return (
    <p>
      <strong>
        {formatted} 🍅{pluralSuffix} were thrown
      </strong>
    </p>
  );
}
