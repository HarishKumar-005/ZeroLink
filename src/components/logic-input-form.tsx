
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type UseFormReturn } from "react-hook-form";
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
import React from "react";

const FormSchema = z.object({
  naturalLanguage: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
});
type FormValues = z.infer<typeof FormSchema>;

interface LogicInputFormProps {
  onSubmit: (logic: Logic | null, error: string | null, rawJson: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  formRef: React.RefObject<{
      formRef: React.RefObject<HTMLFormElement>;
      setValue: UseFormReturn<FormValues>['setValue'];
      handleSubmit: UseFormReturn<FormValues>['handleSubmit'];
  }>;
}

export function LogicInputForm({ onSubmit, setIsLoading, formRef: parentRef }: LogicInputFormProps) {
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      naturalLanguage: "",
    },
  });

  const internalFormRef = React.useRef<HTMLFormElement>(null);

  // Expose the form instance to the parent component
  React.useImperativeHandle(parentRef, () => ({
    formRef: internalFormRef,
    setValue: form.setValue,
    handleSubmit: form.handleSubmit,
  }));

  async function handleFormSubmit(data: FormValues) {
    setIsLoading(true);
    onSubmit(null, null, null); // Clear previous results
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
      <form ref={internalFormRef} onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
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
