<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1Js0Da2gOzDlzbjf-W4MZE2riDU2wjrE5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


gcloud functions add-iam-policy-binding getReceipts --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding saveReceipt --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding updateReceipt --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding deleteReceipt --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding checkDuplicate --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding findAndFlagDuplicates --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding backfillHashes --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding processReceiptImage --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding processCsv --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
gcloud functions add-iam-policy-binding chatWithReceipts --region us-central1 --project spendwise-ai-b7b1f --member=allUsers --role=roles/run.invoker --gen2
