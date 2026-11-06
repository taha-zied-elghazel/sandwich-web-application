import { Button, Card, Col, ListGroup, Row, Stack } from 'react-bootstrap';

function ConfirmedOrders(props) {
  return (
    <Card>
      <Card.Header className="py-2">
        <Card.Title className="h5 mb-0">Confirmed orders</Card.Title>
      </Card.Header>
      <Card.Body className="py-2 px-2">
        {!props.user ? <small className="text-muted">Login to manage your orders.</small> : null}
        {props.orders.length ? (
          <ListGroup variant="flush">
            {props.orders.map(order => (
              <ListGroup.Item className="py-2 px-0" key={order.id}>
                <Stack gap={1}>
                  <Row className="align-items-center">
                    <Col><strong>Order #{order.id}</strong></Col>
                    <Col xs="auto">€{order.total_price.toFixed(2)}</Col>
                  </Row>
                  {order.discount ? <small className="text-muted">Discount: €{order.discount.toFixed(2)}</small> : null}
                  {order.sandwiches.map(item => (
                    <small className="text-muted" key={item.id}>
                      {item.quantity} × {item.size_code} {item.main_name}, {item.bread_name}: {item.ingredients.map(i => i.name).join(', ')}
                      {item.dressings.length ? ` · ${item.dressings.map(i => i.name).join(', ')}` : ''}
                    </small>
                  ))}
                  <Stack direction="horizontal" gap={2} className="justify-content-end">
                    <Button variant="warning" onClick={() => props.duplicateOrder(order)}>Duplicate</Button>
                    <Button variant="danger" onClick={() => props.deleteOrder(order.id)} disabled={!props.user?.is2faVerified || props.waiting}>Delete</Button>
                  </Stack>
                </Stack>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : null}
      </Card.Body>
    </Card>
  );
}

export { ConfirmedOrders };
