import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Settings } from "lucide-react";

const TopMenu = () => {
  const location = useLocation();

  const menuItems = [
    {
      label: "Dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
      path: "/dashboard",
    },
    {
      label: "Leads",
      icon: <Users className="w-4 h-4" />,
      path: "/leads",
    },
    {
      label: "Settings",
      icon: <Settings className="w-4 h-4" />,
      path: "/settings",
    },
  ];

  return (
    <div className="border-b border-[#d2d2d7]">
      <div className="container mx-auto">
        <nav className="flex items-center space-x-8 h-16">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 text-[15px] font-medium ${
                location.pathname === item.path
                  ? "text-primary"
                  : "text-[#86868b] hover:text-[#1d1d1f]"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default TopMenu;
