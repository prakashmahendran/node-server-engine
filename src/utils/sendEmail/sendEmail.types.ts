/** Structure representing an email recipient */
export interface EmailRecipient {
  /** Email of the person to which the email should be sent */
  email: string;
  /** Name of the person receiving the email */
  name?: string;
}
