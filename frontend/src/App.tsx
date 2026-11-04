import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { CategoryPage } from './pages/CategoryPage.tsx'
import { EnquiryPage } from './pages/EnquiryPage.tsx'
import { HomePage } from './pages/HomePage.tsx'
import { ProductPage } from './pages/ProductPage.tsx'
import { SearchPage } from './pages/SearchPage.tsx'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="category/:category" element={<CategoryPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="products/:id" element={<ProductPage />} />
        <Route path="products/:id/enquire" element={<EnquiryPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
