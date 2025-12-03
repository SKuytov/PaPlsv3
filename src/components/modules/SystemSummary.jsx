import React from 'react';
import { 
  Database, Shield, Layout, Server, Globe
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const TechBadge = ({ children }) => (
  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 mr-2 mb-2">
    {children}
  </span>
);

const SystemSummary = () => {
  return (
    <div className="h-[calc(100vh-8rem)] p-2">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">System Architecture</h1>
          <p className="text-slate-500">Technical overview of the WMS stack and structure.</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          v1.0.0-stable
        </Badge>
      </div>

      <Tabs defaultValue="stack" className="h-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stack">Tech Stack</TabsTrigger>
          <TabsTrigger value="database">Database Schema</TabsTrigger>
          <TabsTrigger value="modules">Modules & Features</TabsTrigger>
        </TabsList>

        <TabsContent value="stack" className="h-[calc(100%-4rem)]">
          <ScrollArea className="h-full pr-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-500" /> Frontend Core
                  </CardTitle>
                  <CardDescription>React-based Single Page Application (SPA)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Framework & Build</h4>
                      <div className="flex flex-wrap">
                        <TechBadge>React 18.2</TechBadge>
                        <TechBadge>Vite 4.4</TechBadge>
                        <TechBadge>React Router 6</TechBadge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Styling & UI</h4>
                      <div className="flex flex-wrap">
                        <TechBadge>TailwindCSS 3.3</TechBadge>
                        <TechBadge>shadcn/ui</TechBadge>
                        <TechBadge>Radix Primitives</TechBadge>
                        <TechBadge>Lucide Icons</TechBadge>
                      </div>
                    </div>
                    <div>
                       <h4 className="font-semibold text-sm mb-2">State & Utils</h4>
                       <div className="flex flex-wrap">
                          <TechBadge>Context API</TechBadge>
                          <TechBadge>React Hook Form</TechBadge>
                          <TechBadge>date-fns</TechBadge>
                          <TechBadge>Recharts</TechBadge>
                       </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-teal-500" /> Backend Services
                  </CardTitle>
                  <CardDescription>Serverless architecture powered by Supabase</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Database & Auth</h4>
                      <div className="flex flex-wrap">
                        <TechBadge>PostgreSQL 15</TechBadge>
                        <TechBadge>Supabase Auth</TechBadge>
                        <TechBadge>Row Level Security (RLS)</TechBadge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Integration</h4>
                      <div className="flex flex-wrap">
                        <TechBadge>Supabase JS Client</TechBadge>
                        <TechBadge>Realtime Subscriptions</TechBadge>
                        <TechBadge>Storage Buckets</TechBadge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                       <Layout className="w-5 h-5 text-purple-500" /> Key Design Patterns
                    </CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="p-4 bg-slate-50 rounded-lg border">
                          <h4 className="font-bold text-slate-800 mb-1">Component-Based</h4>
                          <p className="text-sm text-slate-600">Atomic design principles using shadcn/ui for consistent, accessible, and reusable UI components.</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-lg border">
                          <h4 className="font-bold text-slate-800 mb-1">Role-Based Access</h4>
                          <p className="text-sm text-slate-600">Strict separation of concerns. Views and actions are conditionally rendered based on User Role (God Admin, Tech, etc).</p>
                       </div>
                       <div className="p-4 bg-slate-50 rounded-lg border">
                          <h4 className="font-bold text-slate-800 mb-1">Optimistic UI</h4>
                          <p className="text-sm text-slate-600">Immediate feedback for user actions (Toasts, Loading Spinners) while async operations complete in background.</p>
                       </div>
                    </div>
                 </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="database" className="h-[calc(100%-4rem)]">
          <ScrollArea className="h-full pr-4">
             <div className="space-y-6">
                <div className="prose max-w-none">
                   <p>The database is normalized to 3NF where possible. Key relationships center around <strong>Spare Parts</strong> and <strong>Machines</strong>.</p>
                </div>

                <div className="grid gap-4">
                   <div className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg flex items-center gap-2 mb-3">
                         <Database className="w-4 h-4" /> Core Tables
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-slate-50 p-3 rounded text-sm font-mono">
                            <div className="font-bold text-blue-600 border-b pb-1 mb-2">spare_parts</div>
                            <ul className="space-y-1 text-slate-600">
                               <li>id (UUID) PK</li>
                               <li>part_number (text)</li>
                               <li>current_quantity (numeric)</li>
                               <li>warehouse_id (FK)</li>
                            </ul>
                         </div>
                         <div className="bg-slate-50 p-3 rounded text-sm font-mono">
                            <div className="font-bold text-blue-600 border-b pb-1 mb-2">orders</div>
                            <ul className="space-y-1 text-slate-600">
                               <li>id (UUID) PK</li>
                               <li>status (enum)</li>
                               <li>created_by (FK -> users)</li>
                               <li>total_amount (numeric)</li>
                            </ul>
                         </div>
                         <div className="bg-slate-50 p-3 rounded text-sm font-mono">
                            <div className="font-bold text-blue-600 border-b pb-1 mb-2">machines</div>
                            <ul className="space-y-1 text-slate-600">
                               <li>id (UUID) PK</li>
                               <li>machine_code (text)</li>
                               <li>status (text)</li>
                               <li>building_id (FK)</li>
                            </ul>
                         </div>
                         <div className="bg-slate-50 p-3 rounded text-sm font-mono">
                            <div className="font-bold text-blue-600 border-b pb-1 mb-2">suppliers</div>
                            <ul className="space-y-1 text-slate-600">
                               <li>id (UUID) PK</li>
                               <li>name (text)</li>
                               <li>is_oem (bool)</li>
                               <li>rating (numeric)</li>
                            </ul>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="modules" className="h-[calc(100%-4rem)]">
          <ScrollArea className="h-full pr-4">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                   { name: 'Inventory', desc: 'Real-time stock tracking, location mapping, and low-stock alerts.' },
                   { name: 'Procurement', desc: 'End-to-end order lifecycle: Draft -> Approval -> Ordered -> Received.' },
                   { name: 'Scanner', desc: 'Integrated Barcode/QR scanner supporting Camera and USB HID modes.' },
                   { name: 'Downtime', desc: 'Log machine failures and automatically calculate financial impact.' },
                   { name: 'Reporting', desc: 'Exportable PDF/CSV reports for audits and financial reviews.' },
                   { name: 'Savings', desc: 'Track OEM vs Alternative part pricing to visualize cost reduction.' },
                   { name: 'Admin', desc: 'User management, role assignment, and system health monitoring.' },
                ].map((mod, i) => (
                   <Card key={i} className="bg-slate-50/50">
                      <CardHeader className="pb-2">
                         <CardTitle className="text-base">{mod.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                         <p className="text-sm text-slate-500">{mod.desc}</p>
                      </CardContent>
                   </Card>
                ))}
             </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemSummary;