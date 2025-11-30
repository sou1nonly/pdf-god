import { DocumentsList } from "@/components/document/DocumentsList";
import { TopBar } from "@/components/layout/TopBar";
import { useNavigate } from "react-router-dom";

const DocumentsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar 
        fileName="My Documents" 
        onFileNameChange={() => {}}
        onSave={() => {}}
        onDownload={() => {}}
        showActions={false}
      />
      <div className="flex-1 container mx-auto py-8 px-4">
        <DocumentsList />
      </div>
    </div>
  );
};

export default DocumentsPage;
