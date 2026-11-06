import { Alert, Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';

function LoginPage(props) {
  return (
    <Row className="justify-content-center">
      <Col md={7} lg={5}>
        <Card>
          <Card.Header>
            <Card.Title className="mb-0">Login</Card.Title>
          </Card.Header>
          <Card.Body>
            {props.pendingTotp ? (
              <Form onSubmit={props.verifyTotp}>
                <Stack gap={3}>
                  <Alert variant="info" className="mb-0">Insert the TOTP code to complete 2FA login.</Alert>
                  <Form.Group>
                    <Form.Label>TOTP code</Form.Label>
                    <Form.Control value={props.totp} onChange={e => props.setTotp(e.target.value)} placeholder="123456" />
                  </Form.Group>
                  <Stack direction="horizontal" gap={2}>
                    <Button type="submit" variant="primary" disabled={props.waiting}>Verify 2FA</Button>
                    <Button variant="danger" onClick={props.cancelLogin} disabled={props.waiting}>Cancel</Button>
                  </Stack>
                </Stack>
              </Form>
            ) : (
              <Form onSubmit={props.login}>
                <Stack gap={3}>
                  <Form.Group>
                    <Form.Label>Email</Form.Label>
                    <Form.Control value={props.email} onChange={e => props.setEmail(e.target.value)} placeholder="email" />
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Password</Form.Label>
                    <Form.Control value={props.password} onChange={e => props.setPassword(e.target.value)} type="password" placeholder="password" />
                  </Form.Group>
                  <Form.Check
                    checked={props.useTotp}
                    label="Login with 2FA"
                    onChange={e => props.setUseTotp(e.target.checked)}
                  />
                  <Stack direction="horizontal" gap={2}>
                    <Button type="submit" variant="primary" disabled={props.waiting}>Login</Button>
                    <Button variant="danger" onClick={props.cancelLogin} disabled={props.waiting}>Cancel</Button>
                  </Stack>
                </Stack>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}

export { LoginPage };
