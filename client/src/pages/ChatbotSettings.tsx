import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Helmet } from 'react-helmet';
import { useClinicContext } from '@/App';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Building2 } from 'lucide-react';

// Schema
const chatbotSettingsSchema = z.object({
  welcomeMessage: z.string().optional().refine((val) => !val || val.length >= 10, {
    message: "Welcome message must be at least 10 characters when provided.",
  }),
  botDisplayName: z.string().optional().refine((val) => !val || val.length >= 3, {
    message: "Bot display name must be at least 3 characters when provided.",
  }),
  ctaButtonLabel: z.string().optional().refine((val) => !val || val.length >= 3, {
    message: "CTA button label must be at least 3 characters when provided.",
  }),
  chatbotTone: z.enum(['Friendly', 'Professional', 'Clinical', 'Casual']).optional(),
});

type ChatbotSettingsFormValues = z.infer<typeof chatbotSettingsSchema>;

const ChatbotSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const { selectedClinicGroup } = useClinicContext();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ChatbotSettingsFormValues>({
    resolver: zodResolver(chatbotSettingsSchema),
    defaultValues: {
      welcomeMessage: undefined,
      botDisplayName: undefined,
      ctaButtonLabel: undefined,
      chatbotTone: 'Friendly',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/chatbot-settings', {
          credentials: 'include',
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        if (result.success && result.data) {
          form.reset(result.data);
        } else {
          form.reset({
            welcomeMessage: "",
            botDisplayName: "",
            ctaButtonLabel: "",
            chatbotTone: "Friendly"
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: `Could not load chatbot settings: ${(error as Error).message}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: ChatbotSettingsFormValues) => {
    setIsSaving(true);
    try {
      const updateData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== undefined && value !== '')
      );

      const response = await fetch('/api/chatbot-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      const result = await response.json();

      if (result.success) {
        const updatedSettings = result.data || result;
        form.reset(updatedSettings);
        toast({
          title: "Success!",
          description: result.message || "Chatbot settings saved successfully.",
        });
      } else {
        throw new Error(result.message || 'Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Could not save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <p>Loading chatbot settings...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Chatbot Settings | ETEA Healthcare</title>
        <meta name="description" content="Edit chatbot settings for your clinic group under ETEA Healthcare." />
      </Helmet>

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-blue-600">{selectedClinicGroup}</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Chatbot Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage tone, CTA, and welcome messages for your assistant.
            </p>
          </div>
          <img
            src="/src/assets/elaine-avatar.png"
            alt="Etaine Avatar"
            className="w-10 h-10 rounded-full shadow-md border-2 border-white dark:border-gray-700"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Chatbot Settings</CardTitle>
            <CardDescription>Customize your AI assistant’s tone and greeting.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="welcomeMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Welcome Message</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the chatbot's welcome message" {...field} />
                      </FormControl>
                      <FormDescription>
                        First message users see when opening the chatbot.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="botDisplayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bot Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter the bot's name" {...field} />
                      </FormControl>
                      <FormDescription>
                        This appears in the chatbot UI.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ctaButtonLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CTA Button Label</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Ask Etaine" {...field} />
                      </FormControl>
                      <FormDescription>
                        Text on the button users click to open the chatbot.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chatbotTone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chatbot Tone</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a tone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Friendly">Friendly</SelectItem>
                          <SelectItem value="Professional">Professional</SelectItem>
                          <SelectItem value="Clinical">Clinical</SelectItem>
                          <SelectItem value="Casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select how your chatbot should sound.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </>
  );
};

export default ChatbotSettingsPage;
