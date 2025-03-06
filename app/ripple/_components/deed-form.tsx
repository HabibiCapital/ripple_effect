"use client"

import { useState } from "react"
import { createDeedAction } from "@/actions/db/deeds-actions"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

export default function DeedForm() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)

    try {
      const result = await createDeedAction(formData)

      if (result.isSuccess) {
        toast({
          title: "Success!",
          description: result.message
        })

        // Reset the form
        const form = document.getElementById("deed-form") as HTMLFormElement
        form.reset()

        // Refresh the data
        router.refresh()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share a New Deed</CardTitle>
        <CardDescription>
          Record your act of kindness so others can be inspired
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="deed-form" action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Helped a neighbor"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe what you did and the impact it had..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Input id="location" name="location" placeholder="City, Country" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude (optional)</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="0.000001"
                placeholder="40.7128"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude (optional)</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="0.000001"
                placeholder="-74.0060"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impact">Estimated Impact (1-10)</Label>
            <Input
              id="impact"
              name="impact"
              type="number"
              min="1"
              max="10"
              defaultValue="1"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Submitting..." : "Submit Deed"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
