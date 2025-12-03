import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import BlogList from './pages/blog/BlogList'
import BlogEdit from './pages/blog/BlogEdit'
import BlogCategoryList from './pages/category/BlogCategoryList'
import PhotoCategoryList from './pages/category/PhotoCategoryList'
import TagList from './pages/tag/TagList'
import PhotoList from './pages/photo/PhotoList'
import PhotoEdit from './pages/photo/PhotoEdit'
import PhotoBulkUpload from './pages/photo/PhotoBulkUpload'
import AIProjectList from './pages/ai/AIProjectList'
import AIProjectEdit from './pages/ai/AIProjectEdit'
import AIDemoList from './pages/ai/AIDemoList'
import AIDemoEdit from './pages/ai/AIDemoEdit'
import AIImageList from './pages/ai/AIImageList'
import AIImageEdit from './pages/ai/AIImageEdit'
import UserList from './pages/user/UserList'
import MediaList from './pages/media/MediaList'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="blogs" element={<BlogList />} />
          <Route path="blogs/new" element={<BlogEdit />} />
          <Route path="blogs/:id" element={<BlogEdit />} />
          <Route path="blog-categories" element={<BlogCategoryList />} />
          <Route path="tags" element={<TagList />} />
          <Route path="photos" element={<PhotoList />} />
          <Route path="photos/new" element={<PhotoEdit />} />
          <Route path="photos/bulk" element={<PhotoBulkUpload />} />
          <Route path="photos/:id" element={<PhotoEdit />} />
          <Route path="photo-categories" element={<PhotoCategoryList />} />
          <Route path="ai-projects" element={<AIProjectList />} />
          <Route path="ai-projects/new" element={<AIProjectEdit />} />
          <Route path="ai-projects/:id" element={<AIProjectEdit />} />
          <Route path="ai-demos" element={<AIDemoList />} />
          <Route path="ai-demos/new" element={<AIDemoEdit />} />
          <Route path="ai-demos/:id" element={<AIDemoEdit />} />
          <Route path="ai-images" element={<AIImageList />} />
          <Route path="ai-images/new" element={<AIImageEdit />} />
          <Route path="ai-images/:id" element={<AIImageEdit />} />
          <Route path="users" element={<UserList />} />
          <Route path="media" element={<MediaList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
