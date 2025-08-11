import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import OrderPage from './component/OrderPage';
import ViewOrder from './component/ViewOrder';
import PendingPage from './component/PendingPage';
import UserHandle from './component/UserHandle';
import Signin from './component/LoginPage';
import Header from './component/Header';
import Extra from './component/Extra';
import AddProduct from './component/AddProduct';
import SellOrder from './component/SaleOrder';

const PrivateRoute = ({ element, loggedIn }) => {
  const hasUser = localStorage.getItem('userName');
  return loggedIn && hasUser ? element : <Navigate to="/" replace />;
};

const LayoutWithHeader = ({ children, onLogout }) => {
  const location = useLocation();
  const hideHeader = location.pathname === '/';
  return (
    <>
      {!hideHeader && <Header onLogout={onLogout} />}
      {children}
    </>
  );
};

function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // ✅ Only set loggedIn if both exist and not empty
    const storedLogin = localStorage.getItem('loggedIn') === 'true';
    const storedUser = localStorage.getItem('userName');
    if (storedLogin && storedUser && storedUser.trim() !== '') {
      setLoggedIn(true);
    } else {
      // Clear stale data
      localStorage.removeItem('loggedIn');
      localStorage.removeItem('userName');
      setLoggedIn(false);
    }
  }, []);

  const handleLogin = (userName) => {
    localStorage.setItem('userName', userName);
    localStorage.setItem('loggedIn', 'true');
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('userName');
    localStorage.removeItem('loggedIn');
    setLoggedIn(false);
  };

  return (
    <Router>
      <LayoutWithHeader onLogout={handleLogout}>
        <Routes>
          <Route
            path="/"
            element={
              loggedIn ? (
                <Navigate to="/order" />
              ) : (
                <Signin onLogin={handleLogin} />
              )
            }
          />
          <Route
            path="/order"
            element={
              <PrivateRoute
                loggedIn={loggedIn}
                element={<OrderPage onLogout={handleLogout} />}
              />
            }
          />
          <Route
            path="/view-orders"
            element={<PrivateRoute loggedIn={loggedIn} element={<ViewOrder />} />}
          />
          <Route
            path="/sell-order"
            element={<PrivateRoute loggedIn={loggedIn} element={<SellOrder />} />}
          />
          <Route
            path="/pending-orders"
            element={<PrivateRoute loggedIn={loggedIn} element={<PendingPage />} />}
          />
          <Route
            path="/user-handle"
            element={<PrivateRoute loggedIn={loggedIn} element={<UserHandle />} />}
          />
          <Route
            path="/add-product"
            element={<PrivateRoute loggedIn={loggedIn} element={<AddProduct />} />}
          />
          <Route
            path="/extra"
            element={<PrivateRoute loggedIn={loggedIn} element={<Extra />} />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutWithHeader>
    </Router>
  );
}

export default App;
