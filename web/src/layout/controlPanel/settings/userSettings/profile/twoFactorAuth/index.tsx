import DisableTwoFactorAuthenticationModal from './DisableModal';
import EnableTwoFactorAuthenticationModal from './EnableModal';

interface Props {
  tfaEnabled?: boolean;
  onAuthError: () => void;
  onChange: () => void;
}

const TwoFactorAuth = (props: Props) => {
  return (
    <>
      <div className="mb-4">Two-factor authentication is an extra layer of security that protects your account.</div>

      <div className="mb-4">
        <small className="text-uppercase text-muted">Status:</small>{' '}
        <span className="fw-bold">{props.tfaEnabled ? 'Enabled' : 'Disabled'}</span>
      </div>

      {props.tfaEnabled ? (
        <DisableTwoFactorAuthenticationModal onAuthError={props.onAuthError} onChange={props.onChange} />
      ) : (
        <EnableTwoFactorAuthenticationModal onAuthError={props.onAuthError} onChange={props.onChange} />
      )}
    </>
  );
};

export default TwoFactorAuth;
