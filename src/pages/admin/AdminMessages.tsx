import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AdminDashboardLayout from "@/components/dashboard/AdminDashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Send, 
  Megaphone, 
  MessageSquare, 
  User, 
  Loader2,
  Trash2,
  Plus
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  content: string | null;
  created_at: string;
}

interface Announcement {
  id: string;
  sender_id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Conversation {
  user_id: string;
  email: string;
  full_name: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

const AdminMessages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [conversationMessages, setConversationMessages] = useState<DirectMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Compose states
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastContent, setBroadcastContent] = useState("");
  const [sending, setSending] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, email, full_name")
        .order("full_name");

      if (profilesError) throw profilesError;
      setUsers(profilesData || []);

      // Fetch direct messages to build conversations
      const { data: messagesData, error: messagesError } = await supabase
        .from("chat_messages")
        .select("*")
        .is("order_id", null)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      // Build conversations from messages
      const conversationMap = new Map<string, Conversation>();
      
      (messagesData || []).forEach((msg: DirectMessage) => {
        // Determine the other party in the conversation
        const otherUserId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        if (!otherUserId) return;

        const profile = profilesData?.find(p => p.user_id === otherUserId);
        if (!profile) return;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            user_id: otherUserId,
            email: profile.email,
            full_name: profile.full_name,
            last_message: msg.content || "",
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
      });

      setConversations(Array.from(conversationMap.values()));

      // Fetch announcements
      const { data: announcementsData, error: announcementsError } = await supabase
        .from("admin_announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;
      setAnnouncements(announcementsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchConversationMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .is("order_id", null)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Filter to only include messages between admin and this user
      const filtered = (data || []).filter((msg: DirectMessage) => 
        (msg.sender_id === userId && msg.receiver_id === user?.id) ||
        (msg.sender_id === user?.id && msg.receiver_id === userId)
      );
      
      setConversationMessages(filtered);
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    fetchConversationMessages(conv.user_id);
  };

  const handleSendDirectMessage = async () => {
    if (!selectedUserId || !messageContent.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: user?.id,
          receiver_id: selectedUserId,
          content: messageContent.trim(),
          message_type: "text",
        });

      if (error) throw error;

      toast({
        title: "Message Sent",
        description: "Your message has been delivered.",
      });

      setIsComposeOpen(false);
      setSelectedUserId("");
      setMessageContent("");
      fetchData();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedConversation || !replyContent.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          sender_id: user?.id,
          receiver_id: selectedConversation.user_id,
          content: replyContent.trim(),
          message_type: "text",
        });

      if (error) throw error;

      setReplyContent("");
      fetchConversationMessages(selectedConversation.user_id);
      
      toast({
        title: "Reply Sent",
        description: "Your reply has been delivered.",
      });
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from("admin_announcements")
        .insert({
          sender_id: user?.id,
          title: broadcastTitle.trim(),
          content: broadcastContent.trim(),
        });

      if (error) throw error;

      toast({
        title: "Announcement Sent",
        description: "Your announcement has been broadcast to all users.",
      });

      setIsBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastContent("");
      fetchData();
    } catch (error) {
      console.error("Error sending broadcast:", error);
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from("admin_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast({
        title: "Deleted",
        description: "Announcement has been removed.",
      });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <AdminDashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Messages</h1>
            <p className="text-muted-foreground">Send messages to users and broadcast announcements.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsComposeOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              New Message
            </Button>
            <Button variant="secondary" onClick={() => setIsBroadcastOpen(true)}>
              <Megaphone className="h-4 w-4 mr-2" />
              Broadcast
            </Button>
          </div>
        </div>

        <Tabs defaultValue="conversations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="conversations">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversations
            </TabsTrigger>
            <TabsTrigger value="announcements">
              <Megaphone className="h-4 w-4 mr-2" />
              Announcements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Conversations List */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Conversations</CardTitle>
                  <CardDescription>{conversations.length} active</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground text-sm">No conversations yet</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setIsComposeOpen(true)}
                      >
                        Start a conversation
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      {conversations.map((conv) => (
                        <button
                          key={conv.user_id}
                          onClick={() => handleSelectConversation(conv)}
                          className={`w-full p-4 text-left border-b border-border hover:bg-muted/50 transition-colors ${
                            selectedConversation?.user_id === conv.user_id ? "bg-muted" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className="bg-primary/10 text-primary">
                                {getInitials(conv.full_name, conv.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {conv.full_name || conv.email}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">
                                {conv.last_message}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Conversation Detail */}
              <Card className="md:col-span-2">
                <CardContent className="p-0 h-[500px] flex flex-col">
                  {selectedConversation ? (
                    <>
                      {/* Header */}
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(selectedConversation.full_name, selectedConversation.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {selectedConversation.full_name || "No name"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {selectedConversation.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                          {conversationMessages.map((msg) => (
                            <div
                              key={msg.id}
                              className={`flex ${
                                msg.sender_id === user?.id ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                  msg.sender_id === user?.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                <p>{msg.content}</p>
                                <p className={`text-xs mt-1 ${
                                  msg.sender_id === user?.id
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}>
                                  {new Date(msg.created_at).toLocaleTimeString([], { 
                                    hour: "2-digit", 
                                    minute: "2-digit" 
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>

                      {/* Reply Input */}
                      <div className="p-4 border-t border-border">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Type a message..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply();
                              }
                            }}
                          />
                          <Button onClick={handleSendReply} disabled={sending || !replyContent.trim()}>
                            {sending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">Select a conversation to view messages</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="announcements">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Broadcast Announcements</CardTitle>
                    <CardDescription>
                      Messages sent to all users on the platform
                    </CardDescription>
                  </div>
                  <Button onClick={() => setIsBroadcastOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : announcements.length === 0 ? (
                  <div className="text-center py-8">
                    <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No announcements yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="border border-border rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="secondary">
                                <Megaphone className="h-3 w-3 mr-1" />
                                Broadcast
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {new Date(announcement.created_at).toLocaleDateString()} at{" "}
                                {new Date(announcement.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <h4 className="font-semibold mb-1">{announcement.title}</h4>
                            <p className="text-muted-foreground">{announcement.content}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Compose Message Dialog */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
              <DialogDescription>
                Send a direct message to a user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Recipient</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-2"
                      />
                    </div>
                    {filteredUsers.slice(0, 20).map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{u.full_name || u.email}</span>
                          {u.full_name && (
                            <span className="text-muted-foreground text-xs">
                              ({u.email})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Type your message..."
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendDirectMessage} 
                disabled={sending || !selectedUserId || !messageContent.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Broadcast Dialog */}
        <Dialog open={isBroadcastOpen} onOpenChange={setIsBroadcastOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Broadcast Announcement</DialogTitle>
              <DialogDescription>
                This message will be visible to all users on the platform
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  placeholder="Announcement title..."
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message</label>
                <Textarea
                  placeholder="Write your announcement..."
                  value={broadcastContent}
                  onChange={(e) => setBroadcastContent(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendBroadcast} 
                disabled={sending || !broadcastTitle.trim() || !broadcastContent.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Send to All Users
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminDashboardLayout>
  );
};

export default AdminMessages;
