import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import IndustryPage from './pages/IndustryPage';
import CompanyPage from "./pages/CompanyPage";
import CompanyViewPage from "./pages/CompanyViewPage";
import CompanyListPage from "./pages/CompanyListPage";
import PersonPage from "./pages/PersonPage";
import PersonListPage from "./pages/PersonListPage";
import PersonViewPage from "./pages/PersonViewPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import EmailPage from "./pages/EmailPage";
import EmailAddPage from "./pages/EmailAddPage";
import EmailEditPage from "./pages/EmailEditPage";
import CellPhonePage from "./pages/CellPhonePage";
import CellPhoneAddPage from "./pages/CellPhoneAddPage";
import CellPhoneEditPage from "./pages/CellPhoneEditPage";
import LocationPage from "./pages/LocationPage";
import LocationAddPage from "./pages/LocationAddPage";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>

            <Route path="/industry" element={<IndustryPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/company/edit/:id" element={<CompanyPage />} />
            <Route path="/company/view/:id" element={<CompanyViewPage />} />
            <Route path="/company-view" element={<CompanyListPage />} />
            <Route path="/person" element={<PersonPage />} />
            <Route path="/person/edit/:id" element={<PersonPage />} />
            <Route path="/person/view/:id" element={<PersonViewPage />} />
            <Route path="/person-view" element={<PersonListPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
            <Route path="/emails" element={<EmailPage />} />
            <Route path="/emails/add" element={<EmailAddPage />} />
            <Route path="/emails/edit/:id" element={<EmailEditPage />} />
            <Route path="/cell-phones" element={<CellPhonePage />} />
            <Route path="/cell-phones/add" element={<CellPhoneAddPage />} />
            <Route path="/cell-phones/edit/:id" element={<CellPhoneEditPage />} />
            <Route path="/locations" element={<LocationPage />} />
            <Route path="/locations/add" element={<LocationAddPage />} />

            <Route index path="/" element={<Home />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Auth Layout */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />
        
          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}
