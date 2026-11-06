import { Badge, Button, Navbar, Stack } from 'react-bootstrap';
import { Link } from 'react-router';

function AppHeader(props) {
  return (
    <Navbar bg="primary" variant="dark" className="mb-1 px-2 py-0">
      <Navbar.Brand>
        <h1 className="h5 mb-0">Sandwich</h1>
        <small className="text-light lh-1">Take-away sandwich orders</small>
      </Navbar.Brand>
      {props.user ? (
        <Stack direction="horizontal" gap={2} className="ms-auto">
          <span className="text-light">{props.user.name}</span>
          <Badge bg="success" className="fs-6 px-2 py-1">€{Number(props.user.credit).toFixed(2)}</Badge>
          <Badge bg={props.user.is2faVerified ? 'light' : 'secondary'} text={props.user.is2faVerified ? 'dark' : undefined}>{props.user.is2faVerified ? '2FA' : 'Password'}</Badge>
          <Button variant="danger" onClick={props.logout}>Logout</Button>
        </Stack>
      ) : (
        <Button as={Link} to="/login" className="ms-auto" variant="light">Login</Button>
      )}
    </Navbar>
  );
}

export { AppHeader };
