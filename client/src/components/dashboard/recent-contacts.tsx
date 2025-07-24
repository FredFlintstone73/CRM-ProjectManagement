import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Contact } from "@shared/schema";

export default function RecentContacts() {
  const { data: contacts, isLoading } = useQuery<Contact[]>({
    queryKey: ['/api/contacts'],
  });

  const recentContacts = contacts?.slice(0, 5) || [];

  const getContactTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800';
      case 'prospect':
        return 'bg-amber-100 text-amber-800';
      case 'team_member':
        return 'bg-green-100 text-green-800';
      case 'strategic_partner':
        return 'bg-purple-100 text-purple-800';
      case 'trusted_professional':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getContactStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'follow_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLastInteraction = (contact: Contact) => {
    const createdDate = new Date(contact.createdAt || '');
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Contact added - 1 day ago';
    if (diffDays < 7) return `Contact added - ${diffDays} days ago`;
    if (diffDays < 30) return `Contact added - ${Math.ceil(diffDays / 7)} weeks ago`;
    return `Contact added - ${Math.ceil(diffDays / 30)} months ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Recent Contacts</CardTitle>
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Contacts</CardTitle>
          <Link href="/contacts">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {recentContacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No contacts found. Create your first contact to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Interaction</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src="" alt={`${contact.firstName} ${contact.lastName}`} />
                          <AvatarFallback>
                            {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{contact.company || 'No company'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getContactTypeColor(contact.contactType)}>
                        {contact.contactType.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getLastInteraction(contact)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className={getContactStatusColor(contact.status || 'active')}>
                        {contact.status || 'active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
