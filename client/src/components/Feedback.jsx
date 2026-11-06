import { Alert } from 'react-bootstrap';

function Feedback(props) {
  return (
    <>
      {props.errorMessage ? (
        <Alert className="py-2 mb-2" variant="danger" dismissible onClose={() => props.setErrorMessage('')}>
          {props.errorMessage}
        </Alert>
      ) : null}
      {props.message ? (
        <Alert className="py-2 mb-2" variant="success" dismissible onClose={() => props.setMessage('')}>
          {props.message}
        </Alert>
      ) : null}
    </>
  );
}

export { Feedback };
