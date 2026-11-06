import { Badge, Button, Card, Col, Form, Row, Stack } from 'react-bootstrap';

function SandwichForm(props) {
  const {
    menu, sandwich, selectedSize, unitPrice, draftQuantitiesBySize,
    setSandwich, toggleSelection, addSandwichToDraft
  } = props;
  const selectedIngredients = menu.ingredients.filter(item => sandwich.ingredientIds.includes(item.id));
  const selectedDressings = menu.dressings.filter(item => sandwich.dressingIds.includes(item.id));
  const availableIngredients = menu.ingredients.filter(item => !sandwich.ingredientIds.includes(item.id));
  const availableDressings = menu.dressings.filter(item => !sandwich.dressingIds.includes(item.id));
  const selectedMain = menu.mains.find(item => item.id === Number(sandwich.mainId));
  const selectedBread = menu.breads.find(item => item.id === Number(sandwich.breadId));
  const currentSize = menu.sizes.find(size => size.code === sandwich.size) || selectedSize;
  const currentAvailable = currentSize ? Math.max(0, currentSize.available - (draftQuantitiesBySize[currentSize.code] || 0)) : 0;
  const sizeUnavailable = currentSize && currentAvailable <= 0;
  const selectedIngredientCount = selectedIngredients.length;
  const includedIngredients = currentSize?.included_ingredients || 0;
  const extraIngredients = Math.max(0, selectedIngredientCount - includedIngredients);
  const basePrice = currentSize?.price || 0;
  const currentPrice = unitPrice(sandwich);
  const extraPrice = Math.round((currentPrice - basePrice) * 100) / 100;

  return (
    <Card border="primary">
      <Card.Header className="py-2">
        <Card.Title className="h5 mb-0">Create sandwich</Card.Title>
      </Card.Header>
      <Card.Body className="py-2 px-2">
        <Stack gap={2}>
          <Card bg="light">
            <Card.Body className="py-2 px-2">
              <Row className="g-2 mb-2">
                {menu.sizes.map(size => (
                  <Col md={4} key={size.code}>
                    <Button
                      className="w-100 py-2"
                      disabled={Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) <= 0}
                      variant={sandwich.size === size.code ? 'secondary' : 'outline-secondary'}
                      onClick={() => setSandwich(current => ({
                        ...current,
                        size: size.code,
                        dressingIds: current.dressingIds.slice(0, size.max_dressings)
                      }))}
                    >
                      <Stack gap={1}>
                        <strong className="h5 mb-0">{size.name}</strong>
                        <span>
                          <Badge bg={sandwich.size === size.code ? 'light' : 'secondary'} text={sandwich.size === size.code ? 'dark' : undefined} className="fs-6 px-2 py-1">
                            €{size.price.toFixed(2)}
                          </Badge>
                          <Badge
                            bg={Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) <= 0
                              ? 'danger'
                              : Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) <= 2 ? 'warning' : 'success'}
                            text={Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) > 0
                              && Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) <= 2 ? 'dark' : undefined}
                            className="ms-2 fs-6 px-2 py-1"
                          >
                            {Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0)) <= 0
                              ? 'Sold out'
                              : `${Math.max(0, size.available - (draftQuantitiesBySize[size.code] || 0))} available`}
                          </Badge>
                        </span>
                      </Stack>
                    </Button>
                  </Col>
                ))}
              </Row>

              <Card>
                <Card.Body className="py-2 px-2">
                  <Row className="g-2">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="mb-1">Main ingredient <Badge bg="danger">Required</Badge></Form.Label>
                        <Form.Select size="sm" value={sandwich.mainId} disabled={sizeUnavailable} onChange={e => setSandwich({ ...sandwich, mainId: Number(e.target.value) })}>
                          <option value="">Choose main ingredient</option>
                          {menu.mains.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="mb-1">Bread <Badge bg="danger">Required</Badge></Form.Label>
                        <Form.Select size="sm" value={sandwich.breadId} disabled={sizeUnavailable} onChange={e => setSandwich({ ...sandwich, breadId: Number(e.target.value) })}>
                          <option value="">Choose bread</option>
                          {menu.breads.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <div className="mt-2">
                <h3 className="h6 mb-1">Ingredients</h3>
                <Stack direction="horizontal" gap={1} className="flex-wrap">
                  {availableIngredients.map(item => (
                    <Stack key={item.id} direction="horizontal" gap={1} className="border rounded px-1 py-1 bg-light align-items-center">
                      <small>{item.name}</small>
                      <Button size="sm" variant="success" className="px-2 py-0 small" disabled={sizeUnavailable} onClick={() => toggleSelection('ingredientIds', item.id)}>
                        + Add
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </div>

              <div className="mt-2">
                <h3 className="h6 mb-1">Dressings</h3>
                <Stack direction="horizontal" gap={1} className="flex-wrap">
                  {availableDressings.map(item => (
                    <Stack key={item.id} direction="horizontal" gap={1} className="border rounded px-1 py-1 bg-light align-items-center">
                      <small>{item.name}</small>
                      <Button size="sm" variant="success" className="px-2 py-0 small" disabled={sizeUnavailable} onClick={() => toggleSelection('dressingIds', item.id, currentSize?.max_dressings)}>
                        + Add
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </div>
            </Card.Body>
          </Card>

          <Card bg="light">
            <Card.Body className="py-2 px-2">
              <Row className="g-2">
                <Col sm={6} lg={4}>
                  <Card>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Base price</small>
                      <div className="fw-bold small">€{basePrice.toFixed(2)}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={6} lg={4}>
                  <Card>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Ingredients</small>
                      <div className="fw-bold small">{selectedIngredientCount} selected / {includedIngredients} included</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col sm={6} lg={4}>
                  <Card border={extraIngredients ? 'danger' : undefined}>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Extra charge</small>
                      <div className={extraIngredients ? 'fw-bold small text-danger' : 'fw-bold small text-success'}>
                        {extraIngredients} extra, +€{extraPrice.toFixed(2)}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <small className="text-muted d-block mt-1">Only ingredients above the included number add +30% each.</small>
              <Row className="g-2 mt-1">
                <Col md={4}>
                  <Card>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Size</small>
                      <div className="fw-bold">{currentSize ? `${currentSize.name} (${currentSize.code})` : 'Not selected'}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Main</small>
                      <div className="fw-bold">{selectedMain ? selectedMain.name : 'Not selected'}</div>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card>
                    <Card.Body className="py-1 px-2">
                      <small className="text-muted">Bread</small>
                      <div className="fw-bold">{selectedBread ? selectedBread.name : 'Not selected'}</div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <div className="mt-2">
                <h3 className="h6 mb-1">Selected ingredients</h3>
                {selectedIngredients.length ? (
                  <Stack direction="horizontal" gap={1} className="flex-wrap">
                    {selectedIngredients.map(item => (
                      <Stack key={item.id} direction="horizontal" gap={1} className="border rounded px-1 py-1 bg-white align-items-center">
                        <small>{item.name}</small>
                        <Button size="sm" variant="danger" className="px-2 py-0 small" title="Remove" disabled={sizeUnavailable} onClick={() => toggleSelection('ingredientIds', item.id)}>
                          - Remove
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                ) : <small className="text-muted">No ingredients selected.</small>}
              </div>
              <div className="mt-2">
                <h3 className="h6 mb-1">Selected dressings</h3>
                {selectedDressings.length ? (
                  <Stack direction="horizontal" gap={1} className="flex-wrap">
                    {selectedDressings.map(item => (
                      <Stack key={item.id} direction="horizontal" gap={1} className="border rounded px-1 py-1 bg-white align-items-center">
                        <small>{item.name}</small>
                        <Button size="sm" variant="danger" className="px-2 py-0 small" title="Remove" disabled={sizeUnavailable} onClick={() => toggleSelection('dressingIds', item.id, currentSize?.max_dressings)}>
                          - Remove
                        </Button>
                      </Stack>
                    ))}
                  </Stack>
                ) : <small className="text-muted">No dressings selected.</small>}
              </div>
              <Stack direction="horizontal" gap={2} className="mt-2 flex-wrap align-items-center">
                <span className="fw-bold">Current price</span>
                <Badge bg="success" className="fs-6 px-3 py-2">€{currentPrice.toFixed(2)}</Badge>
                <Button variant="primary" disabled={sizeUnavailable} onClick={addSandwichToDraft}>Add sandwich</Button>
              </Stack>
            </Card.Body>
          </Card>

        </Stack>
      </Card.Body>
    </Card>
  );
}

export { SandwichForm };
