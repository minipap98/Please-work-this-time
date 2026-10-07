// Rate the shop once a Bosun job is completed. One review per job; it stays on the shop's profile.
import { useState } from "react";
import { Text } from "react-native";
import { STAR_LABELS } from "@bosun/shared/vendors/reviews";
import { colors, space } from "@/lib/theme";
import { useCreateReview, useMyReview } from "@/lib/vendors";
import { Button, Card, ErrorText, Field, Muted } from "@/ui";
import { Stars } from "@/ui/pickers";

export function ReviewCard({ projectId, vendorId, vendorName }: { projectId: string; vendorId: string; vendorName: string }) {
  const { data: mine, isLoading } = useMyReview(projectId);
  const create = useCreateReview();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (isLoading) return null;
  if (mine) {
    return (
      <Card style={{ borderColor: colors.green }}>
        <Text style={{ fontWeight: "700", color: colors.navy }}>Thanks for reviewing {vendorName}</Text>
        <Stars value={mine.stars} size={18} />
        {!!mine.comment && <Muted style={{ marginTop: 4 }}>{mine.comment}</Muted>}
      </Card>
    );
  }
  return (
    <Card style={{ borderColor: colors.sky }}>
      <Text style={{ fontWeight: "700", color: colors.navy }}>How was {vendorName}?</Text>
      <Muted style={{ marginBottom: space.sm }}>Your review goes on their public profile with your first name.</Muted>
      <Stars value={stars} size={30} onChange={setStars} />
      {stars > 0 && <Muted style={{ marginTop: 4 }}>{STAR_LABELS[stars]}</Muted>}
      <Field label="Anything other owners should know? (optional)" value={comment} onChangeText={setComment} multiline />
      <ErrorText>{error}</ErrorText>
      <Button
        title="Post review"
        disabled={stars === 0}
        loading={create.isPending}
        onPress={async () => {
          setError(null);
          try {
            await create.mutateAsync({ projectId, vendorId, stars, comment });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't post the review.");
          }
        }}
      />
    </Card>
  );
}
