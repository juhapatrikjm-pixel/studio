'use server';
/**
 * @fileOverview A Genkit flow for summarizing team discussions.
 *
 * - summarizeTeamDiscussion - A function that summarizes lengthy team discussions.
 * - SummarizeTeamDiscussionInput - The input type for the summarizeTeamDiscussion function.
 * - SummarizeTeamDiscussionOutput - The return type for the summarizeTeamDiscussion function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SummarizeTeamDiscussionInputSchema = z.object({
  discussionText: z.string().describe('The full text of the team discussion or communication thread to be summarized.'),
});
export type SummarizeTeamDiscussionInput = z.infer<typeof SummarizeTeamDiscussionInputSchema>;

const SummarizeTeamDiscussionOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the key points from the team discussion.'),
});
export type SummarizeTeamDiscussionOutput = z.infer<typeof SummarizeTeamDiscussionOutputSchema>;

export async function summarizeTeamDiscussion(input: SummarizeTeamDiscussionInput): Promise<SummarizeTeamDiscussionOutput> {
  return summarizeTeamDiscussionFlow(input);
}

const summarizeTeamDiscussionPrompt = ai.definePrompt({
  name: 'summarizeTeamDiscussionPrompt',
  input: { schema: SummarizeTeamDiscussionInputSchema },
  output: { schema: SummarizeTeamDiscussionOutputSchema },
  prompt: `You are an AI assistant tasked with summarizing team discussions.
Your goal is to extract the key points and provide a concise overview that allows a team member to quickly understand the main topics and decisions without reading the entire thread.

Discussion:
{{{discussionText}}}

Please provide a clear and brief summary of the above discussion.`,
});

const summarizeTeamDiscussionFlow = ai.defineFlow(
  {
    name: 'summarizeTeamDiscussionFlow',
    inputSchema: SummarizeTeamDiscussionInputSchema,
    outputSchema: SummarizeTeamDiscussionOutputSchema,
  },
  async (input) => {
    const { output } = await summarizeTeamDiscussionPrompt(input);
    return output!;
  }
);
