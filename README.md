# mellow-agent（AI部長）

Next.js + Supabase による社内向け業務支援アプリの骨格です。

## 構成

- **ログイン画面** (`/login`): メールアドレス・パスワードによるログイン（Supabase Auth）
- **箱メニュー** (`/`): ログイン後に表示される5つの箱（商談記録・採点・教育・日報・報告）。中身は準備中のプレースホルダー
- **管理画面** (`/admin`, MELLOWスタッフ専用): 会社の登録、利用者アカウントの登録
- **会社ごとのデータ分離**: Supabase の Row Level Security (RLS) により、利用者は自社のデータのみ参照可能

## セットアップ

1. Supabase プロジェクトを作成する
2. `supabase/schema.sql` を Supabase の SQL Editor で実行し、テーブルと RLS ポリシーを作成する
3. `.env.local.example` を `.env.local` にコピーし、Supabase の URL・キーを設定する

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
