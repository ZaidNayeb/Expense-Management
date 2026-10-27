import PageHeader from '../components/layout/PageHeader.jsx';
import Icon from '../components/common/Icon.jsx';
import { ErrorState, LoadingState } from '../components/common/States.jsx';
import { useApiData } from '../hooks/useApiData.js';
import { getProfile } from '../services/userService.js';
import { formatDate, initials } from '../utils/format.js';

export default function Profile() {
  const { data: profile, error, reload } = useApiData(getProfile, []);

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <section className="card profile-card">
        {error && !profile ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !profile ? (
          <LoadingState />
        ) : (
          <>
            <div className="profile-head">
              <span className="avatar avatar-lg" aria-hidden="true">{initials(profile.name)}</span>
              <div>
                <p className="profile-name">{profile.name}</p>
                <p className="profile-email">{profile.email}</p>
              </div>
            </div>
            <dl className="detail-list">
              <div><dt><Icon name="user" size={16} /> Name</dt><dd>{profile.name}</dd></div>
              <div><dt><Icon name="mail" size={16} /> Email</dt><dd>{profile.email}</dd></div>
              <div>
                <dt><Icon name="shield" size={16} /> Role</dt>
                <dd><span className={`role-badge role-${profile.role}`}>{profile.role === 'admin' ? 'Administrator' : 'User'}</span></dd>
              </div>
              <div><dt><Icon name="calendar" size={16} /> Member since</dt><dd>{formatDate(profile.createdAt)}</dd></div>
            </dl>
          </>
        )}
      </section>
    </>
  );
}
