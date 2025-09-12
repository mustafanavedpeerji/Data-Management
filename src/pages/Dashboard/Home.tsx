import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import apiClient from "../../config/api";
import { BoxCubeIcon, UserCircleIcon, MailIcon, ChatIcon } from "../../icons";

interface DashboardStats {
  totalCompanies: number;
  totalPersons: number;
  totalEmails: number;
  totalCellPhones: number;
  totalIndustries: number;
  recentAuditLogs: any[];
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCompanies: 0,
    totalPersons: 0,
    totalEmails: 0,
    totalCellPhones: 0,
    totalIndustries: 0,
    recentAuditLogs: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        
        // Load statistics from all modules
        const [companiesRes, personsRes, emailsRes, phonesRes, industriesRes, auditRes] = await Promise.all([
          apiClient.get('/companies/all'),
          apiClient.get('/persons/all'),
          apiClient.get('/emails/all'),
          apiClient.get('/cell-phones/all'),
          apiClient.get('/industries/root'),
          apiClient.get('/audit-logs?limit=5')
        ]);

        const companies = companiesRes.ok ? await companiesRes.json() : [];
        const persons = personsRes.ok ? await personsRes.json() : [];
        const emails = emailsRes.ok ? await emailsRes.json() : [];
        const phones = phonesRes.ok ? await phonesRes.json() : [];
        const industries = industriesRes.ok ? await industriesRes.json() : [];
        const auditLogs = auditRes.ok ? await auditRes.json() : [];

        setStats({
          totalCompanies: companies.length || 0,
          totalPersons: persons.length || 0,
          totalEmails: emails.length || 0,
          totalCellPhones: phones.length || 0,
          totalIndustries: industries.length || 0,
          recentAuditLogs: auditLogs.slice(0, 5) || []
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const StatCard = ({ title, count, icon, bgColor }: { title: string; count: number; icon: React.ReactNode; bgColor: string }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{loading ? "..." : count}</p>
        </div>
        <div className={`${bgColor} p-3 rounded-lg`}>
          <div className="text-white w-6 h-6">
            {icon}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <PageMeta
        title="Business Dashboard | Management System"
        description="Professional business dashboard showing companies, persons, emails, and cell phone statistics"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Overview of your business operations</p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Companies"
            count={stats.totalCompanies}
            icon={<BoxCubeIcon />}
            bgColor="bg-blue-500"
          />
          <StatCard
            title="Total Persons"
            count={stats.totalPersons}
            icon={<UserCircleIcon />}
            bgColor="bg-green-500"
          />
          <StatCard
            title="Total Emails"
            count={stats.totalEmails}
            icon={<MailIcon />}
            bgColor="bg-purple-500"
          />
          <StatCard
            title="Cell Phones"
            count={stats.totalCellPhones}
            icon={<ChatIcon />}
            bgColor="bg-orange-500"
          />
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Latest changes in your system</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="text-gray-600 dark:text-gray-400">Loading recent activity...</div>
              </div>
            ) : stats.recentAuditLogs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentAuditLogs.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.action_type} in {log.table_name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {log.user_name || 'System'} • {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">No recent activity found</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Common tasks to get you started</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <a
                href="/company"
                className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <BoxCubeIcon className="w-5 h-5 text-blue-500 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Company</span>
              </a>
              <a
                href="/person"
                className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <UserCircleIcon className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Person</span>
              </a>
              <a
                href="/emails/add"
                className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <MailIcon className="w-5 h-5 text-purple-500 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Email</span>
              </a>
              <a
                href="/cell-phones/add"
                className="flex items-center p-4 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <ChatIcon className="w-5 h-5 text-orange-500 mr-3" />
                <span className="text-sm font-medium text-gray-900 dark:text-white">Add Cell Phone</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}