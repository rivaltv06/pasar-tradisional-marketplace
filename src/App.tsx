import { AppShell } from '@/components/AppShell'
import Browse from '@/pages/Browse'
import Cart from '@/pages/Cart'
import Checkout from '@/pages/Checkout'
import Home from '@/pages/Home'
import Login from '@/pages/Login'
import OrderDetail from '@/pages/OrderDetail'
import Orders from '@/pages/Orders'
import ProductDetail from '@/pages/ProductDetail'
import Register from '@/pages/Register'
import SellerHome from '@/pages/SellerHome'
import SellerOrders from '@/pages/SellerOrders'
import SellerProducts from '@/pages/SellerProducts'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'

export default function App() {
  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jelajah" element={<Browse />} />
          <Route path="/produk/:id" element={<ProductDetail />} />
          <Route path="/keranjang" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pesanan" element={<Orders />} />
          <Route path="/pesanan/:id" element={<OrderDetail />} />
          <Route path="/masuk" element={<Login />} />
          <Route path="/daftar" element={<Register />} />
          <Route path="/pedagang" element={<SellerHome />} />
          <Route path="/pedagang/produk" element={<SellerProducts />} />
          <Route path="/pedagang/pesanan" element={<SellerOrders />} />
          <Route
            path="*"
            element={
              <div className="paper grain rounded-[32px] p-10 text-center">
                <div className="font-display text-3xl">Halaman tidak ditemukan</div>
                <div className="mt-2 text-sm text-[hsl(var(--muted))]">Coba kembali ke beranda.</div>
              </div>
            }
          />
        </Routes>
      </AppShell>
    </Router>
  )
}
