
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateLogicAction } from "@/lib/actions";
import { type Logic } from "@/types";
import { Sparkles } from "lucide-react";

const FormSchema = z.object({
  naturalLanguage: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
});

interface LogicInputFormProps {
  onSubmit: (logic: Logic | null, error: string | null, rawJson: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

export function LogicInputForm({ onSubmit, setIsLoading }: LogicInputFormProps) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      naturalLanguage: "",
    },
  });

  async function handleFormSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    const { logic, error, rawJson } = await generateLogicAction(data.naturalLanguage);
    
    if (error && !logic) {
      toast({
        title: "Generation Failed",
        description: error,
        variant: "destructive",
      });
    }

    onSubmit(logic, error, rawJson);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="naturalLanguage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Logic Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='e.g., "When the temperature goes above 25 degrees, flash the background blue."'
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate Logic
        </Button>
      </form>
    </Form>
  );
}
