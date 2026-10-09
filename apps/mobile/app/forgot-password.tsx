import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { Link } from "expo-router";
import { RESET_SENT_MESSAGE } from "@bosun/shared/auth";
import { useAuth } from "@/lib/auth";
import { colors, space } from "@/lib/theme";
import { Button, ErrorText, Field, Screen } from "@/ui";

/** Ask for a reset link. The link opens getbosun.app, where the new password is set; then sign in here. */
export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const err = await resetPassword(email);
    setBusy(false);
    if (err) setError(err);
    else setSent(true);
  }

  if (sent) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 22, fontWeight: "700", color: colors.navy }}>Check your email</Text>
          <Text style={{ color: colors.muted, marginTop: 8, marginBottom: space.xl }}>{RESET_SENT_MESSAGE} The link opens a page where you choose a new password; then come back and sign in.</Text>
          <Link href="/login" asChild>
            <Button title="Back to sign in" tone="secondary" />
          </Link>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "700", color: colors.navy }}>Forgot your password?</Text>
        <Text style={{ color: colors.muted, marginTop: 6, marginBottom: space.xl }}>Enter the email on your account and we'll send a link to set a new one.</Text>
        <Field label="Email" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        <Button title="Send reset link" onPress={submit} loading={busy} disabled={!email.trim()} />
        <View style={{ marginTop: space.xl, alignItems: "center" }}>
          <Link href="/login" style={{ color: colors.sky600, fontWeight: "600" }}>
            Back to sign in
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
