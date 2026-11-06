import { useEffect, useState } from 'react';
import { Col, Container, Row, Stack } from 'react-bootstrap';
import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { API } from './API';
import { AppHeader } from './components/AppHeader';
import { ConfirmedOrders } from './components/ConfirmedOrders';
import { DraftOrder } from './components/DraftOrder';
import { Feedback } from './components/Feedback';
import { LoginPage } from './components/LoginPage';
import { SandwichForm } from './components/SandwichForm';

const emptySandwich = {
  size: 'S',
  mainId: '',
  breadId: '',
  ingredientIds: [],
  dressingIds: [],
  quantity: 1
};

function App() {
  const [menu, setMenu] = useState({ sizes: [], mains: [], breads: [], ingredients: [], dressings: [] });
  const [user, setUser] = useState();
  const [orders, setOrders] = useState([]);
  const [sandwich, setSandwich] = useState(emptySandwich);
  const [draftOrder, setDraftOrder] = useState([]);
  const [email, setEmail] = useState('user1@sandwich.com');
  const [password, setPassword] = useState('password');
  const [totp, setTotp] = useState('');
  const [useTotp, setUseTotp] = useState(false);
  const [pendingTotp, setPendingTotp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [message, setMessage] = useState('');
  const [waiting, setWaiting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    API.getMenu()
      .then(menu => setMenu(menu))
      .catch(err => setErrorMessage(err.error));

    API.getCurrentUser()
      .then(u => {
        setUser(u);
        return API.getOrders();
      })
      .then(setOrders)
      .catch(err => {
        if (err.error !== 'Not authenticated') setErrorMessage(err.error);
      });
  }, []);

  function refreshPublicData() {
    return API.getSizes()
      .then(sizes => setMenu(current => ({ ...current, sizes })))
      .catch(err => setErrorMessage(err.error));
  }

  async function refreshPrivateData() {
    if (!user) return;
    const [currentUser, userOrders] = await Promise.all([API.getCurrentUser(), API.getOrders()]);
    setUser(currentUser);
    setOrders(userOrders);
  }

  const selectedSize = menu.sizes.find(size => size.code === sandwich.size);

  function itemName(list, id) {
    return list.find(item => item.id === Number(id))?.name || '';
  }

  function unitPrice(item) {
    const size = menu.sizes.find(s => s.code === item.size);
    if (!size) return 0;
    const extra = Math.max(0, item.ingredientIds.length - size.included_ingredients);
    return Math.round(size.price * (1 + extra * 0.3) * 100) / 100;
  }

  function sumDraftPrices(order) {
    if (order.length === 0) return 0;
    return unitPrice(order[0]) * Number(order[0].quantity) + sumDraftPrices(order.slice(1));
  }

  function sumDraftQuantities(order) {
    if (order.length === 0) return 0;
    return Number(order[0].quantity) + sumDraftQuantities(order.slice(1));
  }

  function countDraftQuantities() {
    return Object.fromEntries(menu.sizes.map(size => [
      size.code,
      sumDraftQuantities(draftOrder.filter(item => item.size === size.code))
    ]));
  }

  function calculateTotals(order) {
    const subtotal = sumDraftPrices(order);
    const quantity = sumDraftQuantities(order);
    const discount = quantity >= 4 ? Math.round(subtotal * 0.2 * 100) / 100 : 0;
    return {
      subtotal,
      quantity,
      discount,
      total: Math.round((subtotal - discount) * 100) / 100
    };
  }

  const totals = calculateTotals(draftOrder);
  const draftQuantitiesBySize = countDraftQuantities();

  function toggleSelection(field, id, limit) {
    setSandwich(current => {
      const alreadySelected = current[field].includes(id);
      if (!alreadySelected && limit && current[field].length >= limit) {
        setErrorMessage(`You can select at most ${limit} dressing(s) for this size`);
        return current;
      }
      return {
        ...current,
        [field]: alreadySelected ? current[field].filter(value => value !== id) : [...current[field], id]
      };
    });
  }

  function addSandwichToDraft() {
    const problems = [];
    const size = selectedSize;
    const quantity = 1;
    const draftQuantity = size ? draftQuantitiesBySize[size.code] || 0 : 0;
    if (!user) problems.push('Login before creating an order');
    if (!size) problems.push('Select a size');
    if (!sandwich.mainId) problems.push('Select a main ingredient');
    if (!sandwich.breadId) problems.push('Select a bread type');
    if (size && draftQuantity + quantity > size.available) {
      problems.push(`Not enough ${size.name} sandwiches available`);
    }
    if (problems.length) {
      setErrorMessage(problems.join(' | '));
      return;
    }

    setDraftOrder(current => [...current, {
      ...sandwich,
      mainId: Number(sandwich.mainId),
      breadId: Number(sandwich.breadId),
      quantity,
      ingredientIds: [...sandwich.ingredientIds],
      dressingIds: [...sandwich.dressingIds]
    }]);
    setSandwich(emptySandwich);
    setErrorMessage('');
    setMessage('Sandwich added to draft order');
  }

  function removeDraftSandwich(index) {
    setDraftOrder(current => current.filter((_, i) => i !== index));
    setErrorMessage('');
  }

  function editDraftSandwich(index) {
    const item = draftOrder[index];
    setSandwich({
      ...item,
      quantity: 1,
      ingredientIds: [...item.ingredientIds],
      dressingIds: [...item.dressingIds]
    });
    setDraftOrder(current => current.filter((_, i) => i !== index));
    setErrorMessage('');
    setMessage('Sandwich moved back to the create form');
  }

  function updateDraftQuantity(index, quantity) {
    const item = draftOrder[index];
    const newQuantity = Number(quantity);
    if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
      setErrorMessage('Quantity must be a positive integer');
      return;
    }

    const size = menu.sizes.find(size => size.code === item.size);
    const otherQuantity = sumDraftQuantities(draftOrder.filter((sandwich, i) => i !== index && sandwich.size === item.size));
    if (size && otherQuantity + newQuantity > size.available) {
      setErrorMessage(`Not enough ${size.name} sandwiches available`);
      return;
    }

    setErrorMessage('');
    setMessage('Quantity updated');
    setDraftOrder(current => current.map((sandwich, i) => (
      i === index ? { ...sandwich, quantity: newQuantity } : sandwich
    )));
  }

  async function confirmOrder() {
    if (!draftOrder.length) {
      setErrorMessage('Add at least one sandwich to the order');
      return;
    }
    setWaiting(true);
    try {
      const result = await API.createOrder(draftOrder);
      setDraftOrder([]);
      setMessage(`Order confirmed. Paid €${result.total.toFixed(2)}`);
      setErrorMessage('');
      await refreshPublicData();
      await refreshPrivateData();
    } catch (err) {
      setErrorMessage(err.error);
    } finally {
      setWaiting(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setWaiting(true);
    setMessage('');
    setErrorMessage('');
    try {
      const loggedUser = await API.login(email, password);
      setUser(loggedUser);
      setErrorMessage('');
      if (useTotp) {
        setPendingTotp(true);
        setMessage('Complete login with the TOTP code');
      } else {
        setOrders(await API.getOrders());
        navigate('/ordering');
        setMessage('');
      }
    } catch (err) {
      setErrorMessage(err.error);
    } finally {
      setWaiting(false);
    }
  }

  async function verifyTotp(event) {
    event.preventDefault();
    setWaiting(true);
    setMessage('');
    setErrorMessage('');
    try {
      await API.loginTotp(totp);
      setUser(await API.getCurrentUser());
      setOrders(await API.getOrders());
      setTotp('');
      setPendingTotp(false);
      navigate('/ordering');
      setMessage('Logged in with 2FA');
      setErrorMessage('');
    } catch (err) {
      setErrorMessage(err.error);
      setMessage('');
    } finally {
      setWaiting(false);
    }
  }

  async function logout() {
    await API.logout().catch(() => {});
    setUser(undefined);
    setOrders([]);
    setDraftOrder([]);
    setUseTotp(false);
    setPendingTotp(false);
    navigate('/login');
    setErrorMessage('');
    setMessage('');
  }

  async function cancelLogin() {
    if (pendingTotp) await API.logout().catch(() => {});
    setUser(undefined);
    setOrders([]);
    setTotp('');
    setPendingTotp(false);
    navigate('/');
    setErrorMessage('');
    setMessage('');
  }

  function duplicateOrder(order) {
    const duplicate = order.sandwiches.map(row => ({
      size: row.size_code,
      mainId: row.main_id,
      breadId: row.bread_id,
      ingredientIds: row.ingredients.map(item => item.id),
      dressingIds: row.dressings.map(item => item.id),
      quantity: row.quantity
    }));

    const nextDraft = [...draftOrder, ...duplicate];
    const unavailable = menu.sizes.find(size => {
      return sumDraftQuantities(nextDraft.filter(item => item.size === size.code)) > size.available;
    });
    if (unavailable) {
      setErrorMessage(`Cannot duplicate: not enough ${unavailable.name} sandwiches available`);
      return;
    }
    setDraftOrder(nextDraft);
    setMessage('Order duplicated and added to the draft area');
    setErrorMessage('');
  }

  async function deleteOrder(orderId) {
    setWaiting(true);
    try {
      const result = await API.deleteOrder(orderId);
      setMessage(`Order deleted. Refunded €${result.refund.toFixed(2)}`);
      setErrorMessage('');
      await refreshPublicData();
      await refreshPrivateData();
    } catch (err) {
      setErrorMessage(err.error);
    } finally {
      setWaiting(false);
    }
  }

  const sandwichPage = (
    <Row className="g-2">
      <Col lg={6}>
        <SandwichForm
          menu={menu}
          sandwich={sandwich}
          selectedSize={selectedSize}
          unitPrice={unitPrice}
          draftQuantitiesBySize={draftQuantitiesBySize}
          setSandwich={setSandwich}
          toggleSelection={toggleSelection}
          addSandwichToDraft={addSandwichToDraft}
        />
      </Col>

      <Col lg={6}>
        <Stack gap={2}>
          <DraftOrder
            draftOrder={draftOrder}
            menu={menu}
            totals={totals}
            waiting={waiting}
            user={user}
            itemName={itemName}
            unitPrice={unitPrice}
            removeDraftSandwich={removeDraftSandwich}
            editDraftSandwich={editDraftSandwich}
            updateDraftQuantity={updateDraftQuantity}
            confirmOrder={confirmOrder}
          />
          <ConfirmedOrders
            user={user}
            orders={orders}
            waiting={waiting}
            duplicateOrder={duplicateOrder}
            deleteOrder={deleteOrder}
          />
        </Stack>
      </Col>
    </Row>
  );

  return (
    <Container className="py-2">
      <AppHeader user={user} logout={logout} />
      <Feedback errorMessage={errorMessage} message={message} setErrorMessage={setErrorMessage} setMessage={setMessage} />

      <Routes>
        <Route path="/" element={sandwichPage} />
        <Route path="/ordering" element={user ? sandwichPage : <Navigate replace to="/login" />} />
        <Route path="/login" element={
          user && !pendingTotp ? <Navigate replace to="/ordering" /> : (
            <LoginPage
              email={email}
              password={password}
              totp={totp}
              useTotp={useTotp}
              pendingTotp={pendingTotp}
              waiting={waiting}
              setEmail={setEmail}
              setPassword={setPassword}
              setTotp={setTotp}
              setUseTotp={setUseTotp}
              login={login}
              verifyTotp={verifyTotp}
              cancelLogin={cancelLogin}
            />
          )
        } />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Container>
  );
}

export default App;
