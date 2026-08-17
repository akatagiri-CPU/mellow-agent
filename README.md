# mellow-agent（AI部長）

Next.js + Supabase による社内向け業務支援アプリの骨格です。

## 構成

- **ログイン画面** (`/login`): メールアドレス・パスワードによるログイン（Supabase Auth）
- **箱メニュー** (`/`): ログイン後に表示される6つの箱（採用管理・人材管理・営業管理・教育・日報/行動ログ・経営ダッシュボード）
  - **採用管理** (`/boxes/recruitment`): 候補者登録、面接前サポート（履歴書・職務経歴書のテキスト貼り付けまたはPDF/画像アップロードから、AIによる強み・懸念点・確認すべき空白の言語化と、6つの評価軸ごとの質問提案）、採点
  - **営業管理** (`/boxes/sales`): 案件（案件名・顧客名・獲得経路・担当者・ステージ・金額・次回アクション）の一覧・追加・編集・削除。案件詳細で進捗ログ（日付・対応者・内容・到達ステージ）を追記でき、最新ログのステージが案件に自動反映される。画面上部には会社ごとに登録されたSFA（Googleスプレッドシート）を新しいタブで開くボタンも表示（未登録時は「SFA未登録」）
  - それ以外の4箱は準備中のプレースホルダー
- **管理画面** (`/admin`, MELLOWスタッフ専用): 会社の登録、利用者アカウントの登録、会社ごとのSFA URLの登録
- **会社ごとのデータ分離**: Supabase の Row Level Security (RLS) により、利用者は自社のデータのみ参照可能

## セットアップ

1. Supabase プロジェクトを作成する
2. `supabase/schema.sql` を Supabase の SQL Editor で実行し、テーブルと RLS ポリシーを作成する（再実行しても安全です）
3. `.env.local.example` を `.env.local` にコピーし、Supabase の URL・キー、Anthropic の API キーを設定する

```bash
cp .env.local.example .env.local
```

4. 依存関係をインストールし、開発サーバーを起動する

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開くと確認できます。

## 最初のMELLOWスタッフ（管理者）の作成

`/admin` にアクセスできるユーザーがまだいない状態からは自己登録できないため、最初の1人は Supabase の SQL Editor から手動で作成してください。

```sql
insert into profiles (id, role, name, email)
values ('<Supabase Authで作成したユーザーのUUID>', 'mellow_admin', '管理者名', 'admin@example.com');
```
