import { Badge, Button, Card, Col, Form, ListGroup, Row, Stack } from 'react-bootstrap';

function DraftOrder(props) {
  const {
    draftOrder, menu, totals, waiting, user, itemName, unitPrice,
    removeDraftSandwich, editDraftSandwich, updateDraftQuantity, confirmOrder
  } = props;

  return (
    <Card border="success">
      <Card.Header className="py-2">
        <Card.Title className="h5 mb-0">Current Order</Card.Title>
      </Card.Header>
      <Card.Body className="py-2 px-2">
        {draftOrder.length === 0 ? <small className="text-muted">No sandwiches in the draft order.</small> : null}
        {draftOrder.length ? (
          <ListGroup variant="flush">
            {draftOrder.map((item, index) => (
              <ListGroup.Item className="py-2 px-0" key={`${item.size}-${index}`}>
                <Row className="align-items-center g-2">
                  <Col>
                    <strong>{item.quantity} × {item.size} {itemName(menu.mains, item.mainId)}</strong>
                    <div><small>{itemName(menu.breads, item.breadId)}</small></div>
                    <small className="text-muted">
                      {item.ingredientIds.map(id => itemName(menu.ingredients, id)).join(', ')}
                      {item.dressingIds.length ? ` · ${item.dressingIds.map(id => itemName(menu.dressings, id)).join(', ')}` : ''}
                    </small>
                  </Col>
                  <Col xs="auto">€{(unitPrice(item) * item.quantity).toFixed(2)}</Col>
                  <Col xs="auto">
                    <Stack direction="horizontal" gap={2}>
                      <Form.Control
                        size="sm"
                        value={item.quantity}
                        min="1"
                        type="number"
                        style={{ width: '4rem' }}
                        onChange={event => updateDraftQuantity(index, event.target.value)}
                      />
                      <Button variant="warning" onClick={() => editDraftSandwich(index)}>Edit</Button>
                      <Button variant="danger" onClick={() => removeDraftSandwich(index)}>Remove</Button>
                    </Stack>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : null}

        <Card bg="light" className="mt-2">
          <Card.Body className="py-2 px-2">
            <Stack direction="horizontal" gap={2} className="flex-wrap">
              <span>Sandwiches: {totals.quantity}</span>
              <span>Subtotal: €{totals.subtotal.toFixed(2)}</span>
              <span>Discount: €{totals.discount.toFixed(2)}</span>
              <Badge bg="success" className="fs-6 px-3 py-2">Total: €{totals.total.toFixed(2)}</Badge>
            </Stack>
          </Card.Body>
        </Card>

        <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap align-items-center">
          <Button variant="primary" onClick={confirmOrder} disabled={!user || waiting}>Confirm order</Button>
          <span className="text-primary">20% discount for 4 or more sandwiches</span>
        </Stack>
      </Card.Body>
    </Card>
  );
}

export { DraftOrder };
