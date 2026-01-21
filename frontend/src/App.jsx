import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './components/HomePage'
import PolicyList from './components/PolicyList'
import Dashboard from './components/Dashboard'
import PlanAnalyzer from './components/PlanAnalyzer'
import PlanAnalyzer2 from './components/PlanAnalyzer2'
import PlanDocumentManagement from './components/PlanDocumentManagement'
import DocumentDetail from './components/DocumentDetail'
import TableDetail from './components/TableDetail'
import DocumentContentEditor from './components/DocumentContentEditor'
import ContentCreator from './components/ContentCreator'
import IPImageGenerator from './components/IPImageGenerator'
import ContentImageGenerator from './components/ContentImageGenerator'
import MediaLibrary from './components/MediaLibrary'
import VideoGenerator from './components/VideoGenerator'
import VideoProjectList from './components/VideoProjectList'
import TextToSpeech from './components/TextToSpeech'
import PDFFooterRemover from './components/PDFFooterRemover'
import PosterAnalyzer from './components/PosterAnalyzer'
import PlanBuilder from './components/PlanBuilder'
import CompanyPlanBuilder from './components/CompanyPlanBuilder'
import BenefitTable from './components/BenefitTable'
import WithdrawalCalculator from './components/WithdrawalCalculator'
import InsuranceCompanyPage from './components/InsuranceCompanyPage'
import ApiCallPage from './components/ApiCallPage'
import CompanyComparison from './components/CompanyComparison'
import CompanyComparisonCC from './components/CompanyComparisonCC'
import MembershipPlans from './components/MembershipPlans'
import Settings from './components/Settings'
import ProductComparisonSettings from './components/ProductComparisonSettings'
import AIConsultation from './components/AIConsultation'
import AIConsultant from './components/AIConsultant'
import CustomerCases from './components/CustomerCases'
import CustomerCaseLibrary from './components/CustomerCaseLibrary'
import CustomerCaseLibraryForum from './components/CustomerCaseLibraryForum'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            {/* 公开页面 - 无需登录 */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/company-comparison" element={<CompanyComparison />} />
            <Route path="/cc" element={<CompanyComparisonCC />} />

            {/* 受保护的页面 - 需要登录 */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/policies" element={
              <ProtectedRoute>
                <PolicyList />
              </ProtectedRoute>
            } />
            <Route path="/plan-analyzer" element={
              <ProtectedRoute>
                <PlanAnalyzer />
              </ProtectedRoute>
            } />
            <Route path="/plan-analyzer-2" element={
              <ProtectedRoute>
                <PlanAnalyzer2 />
              </ProtectedRoute>
            } />
            <Route path="/plan-management" element={
              <ProtectedRoute>
                <PlanDocumentManagement />
              </ProtectedRoute>
            } />
            <Route path="/document/:id" element={
              <ProtectedRoute>
                <DocumentDetail />
              </ProtectedRoute>
            } />
            <Route path="/document/:id/content-editor" element={
              <ProtectedRoute>
                <DocumentContentEditor />
              </ProtectedRoute>
            } />
            <Route path="/table/:tableId" element={
              <ProtectedRoute>
                <TableDetail />
              </ProtectedRoute>
            } />
            <Route path="/content-creator" element={
              <ProtectedRoute>
                <ContentCreator />
              </ProtectedRoute>
            } />
            <Route path="/ip-image-generator" element={
              <ProtectedRoute>
                <IPImageGenerator />
              </ProtectedRoute>
            } />
            <Route path="/content-image-generator" element={
              <ProtectedRoute>
                <ContentImageGenerator />
              </ProtectedRoute>
            } />
            <Route path="/media-library" element={
              <ProtectedRoute>
                <MediaLibrary />
              </ProtectedRoute>
            } />
            <Route path="/video-projects" element={
              <ProtectedRoute>
                <VideoProjectList />
              </ProtectedRoute>
            } />
            <Route path="/video-generator" element={
              <ProtectedRoute>
                <VideoGenerator />
              </ProtectedRoute>
            } />
            <Route path="/text-to-speech" element={
              <ProtectedRoute>
                <TextToSpeech />
              </ProtectedRoute>
            } />
            <Route path="/pdf-footer-remover" element={
              <ProtectedRoute>
                <PDFFooterRemover />
              </ProtectedRoute>
            } />
            <Route path="/poster-analyzer" element={
              <ProtectedRoute>
                <PosterAnalyzer />
              </ProtectedRoute>
            } />
            <Route path="/plan-builder" element={
              <ProtectedRoute>
                <PlanBuilder />
              </ProtectedRoute>
            } />
            <Route path="/plan-builder/:companyId" element={
              <ProtectedRoute>
                <CompanyPlanBuilder />
              </ProtectedRoute>
            } />
            <Route path="/benefit-table/:companyId" element={
              <ProtectedRoute>
                <BenefitTable />
              </ProtectedRoute>
            } />
            <Route path="/withdrawal-calculator/:companyId" element={
              <ProtectedRoute>
                <WithdrawalCalculator />
              </ProtectedRoute>
            } />
            <Route path="/insurance-company/:companyCode" element={
              <ProtectedRoute>
                <InsuranceCompanyPage />
              </ProtectedRoute>
            } />
            <Route path="/api-call/:companyCode/:requestName" element={
              <ProtectedRoute>
                <ApiCallPage />
              </ProtectedRoute>
            } />
            <Route path="/membership-plans" element={
              <ProtectedRoute>
                <MembershipPlans />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/product-comparison-settings" element={
              <ProtectedRoute>
                <ProductComparisonSettings />
              </ProtectedRoute>
            } />
            <Route path="/ai-consultation" element={
              <ProtectedRoute>
                <AIConsultation />
              </ProtectedRoute>
            } />
            <Route path="/ai-consultant" element={
              <ProtectedRoute>
                <AIConsultant />
              </ProtectedRoute>
            } />
            <Route path="/customer-cases" element={<CustomerCaseLibraryForum />} />
            <Route path="/customer-cases/:id" element={<CustomerCaseLibraryForum />} />

            {/* 未匹配路由重定向到首页 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
