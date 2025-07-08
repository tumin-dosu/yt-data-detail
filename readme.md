#  Youtube-Date-Detail

YouTubeの動画リストで相対的な日付表示（「3年前」など）の横に**実際のアップロード年月日**を表示するChrome拡張機能です。
配信者やVtuberなどで過去のアーカイブなどをさかのぼり複数視点のアーカイブを見る時などに便利です。

## 機能

- YouTube Data API v3を使用して正確なアップロード日を取得
- 相対的な日付表示の横に実際の年月日を表示
- 対応箇所：
  - 検索結果の動画リスト
  - ホーム画面の動画
  - サイドバーの推奨動画
  - ライブ配信の推奨動画
  - チャンネルページの動画
  - 関連動画部分
- 非同期処理でページの動作を妨げない
- 関連動画の場合タイトルが長かったりすると日付を読み込んで表示した際に日付が見えなくなります。いつか修正予定です

## 事前準備：YouTube Data API キーの取得

### 1. Google Cloud Console でプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスしGoogleアカウントでログイン

2. 左上のプロジェクトの選択→新しいプロジェクト
![画像](https://github.com/user-attachments/assets/8739d249-7246-4a0b-9920-683601ef73d6)

3. 分かりやすいプロジェクト名を設定

### 2. YouTube Data API v3 を有効化

1. プロジェクトを選択から先ほど作ったプロジェクトを選択

2. 左上の三重線をクリックし「APIとサービス」から「ライブラリ」を選択
![画像](https://github.com/user-attachments/assets/afd514f8-4f87-4514-b0c5-e0f80bf648c7)

3. 検索窓でYoutube data api v3を検索

4. 選択し「有効にする」をクリック
![画像](https://github.com/user-attachments/assets/d1022e58-7b85-4e80-8916-ab0c1412e2fc)


### 3. APIキーを作成

1. 認証情報タブに移動
![画像](https://github.com/user-attachments/assets/1697d359-ccbb-4e8a-a930-1258478e0e9d)

2. 「認証情報を作成」→「APIキー」を選択

3. 作成されたAPIキーをコピー（後で使用）

### 4. APIキーを制限（推奨）

1. 作成したAPIキーの名前をクリックして設定画面を表示
![画像](https://github.com/user-attachments/assets/d199aa88-4e7d-4267-be3e-397062857fce)

2. 「キーの制限」で「HTTPリファラー（ウェブサイト）」を選択

3. 「ウェブサイトの制限」に `https://www.youtube.com/*` を追加

4. 「API の制限」で「キーを制限」を選択し、「YouTube Data API v3」を選択し保存
![画像](https://github.com/user-attachments/assets/6be1472f-d8c3-47cc-908f-c4d817c065ae)

## インストール方法

### 1. [Chrome Web Store](https://chromewebstore.google.com/detail/oocnjlebnobfakindfoocaoodegeapfe?utm_source=item-share-cb)からインストール

  - Chrome Web Storeから追加してください
  - 追加できたら使用方法まで飛ばしてください

### 1. マニュアルインストール:ファイルの準備

- 全てのファイルを同じフォルダに保存してください

### 2. Chrome拡張機能として読み込み

1. Chromeで `chrome://extensions/` を開く

2. 右上の「デベロッパーモード」をオンにする

3. 「パッケージ化されていない拡張機能を読み込む」をクリック

4. 上記ファイルを保存したフォルダを選択

## 使用方法

### 1. 初回設定

1. Chromeで `chrome://extensions/` を開く

2. yt-data-detailの詳細をクリック

3. 拡張機能のオプションをクリック

4. APIキーを入力(先ほどコピーしたものを入力 コピーしたものが消えた場合は先ほどの認証情報→鍵を表示でコピー)
![画像](https://github.com/user-attachments/assets/40854cf7-391c-40d0-9ffd-edd19a97ce39)

### 2. 動作確認

- マウスカーソルをタイトルに合わせ続けると動画リストで「3年前」などの相対的な日付表示の横に「2018/03/06」のような実際のアップロード日が表示されます
- 「(取得中...)」と表示され、API呼び出し完了後に実際の日付に変わります

## 設定項目
  
  - デバックモードを有効にする : デバックモードを有効にします 基本的にはオフにしてください
  - リセット　　　　　　　　　 : 設定をリセットします
  
## トラブルシューティング

### APIキーエラーの場合

1. APIキーが正しく入力されているか確認
2. YouTube Data API v3 が有効になっているか確認
3. APIキーの制限設定を確認

### 動作が不安定な場合

1. ページを再読み込み
2. 拡張機能を再読み込み
3. APIの使用制限に達していないか確認（1日あたり10,000リクエスト）

## 注意事項

- YouTube Data API v3 の使用制限があります（1日あたり10,000リクエスト）
- 大量の動画を閲覧する場合は制限に注意してください
- APIキーは安全に管理し、他人に共有しないでください
- APIキーの制限設定を適切に行ってください
- この拡張機能はLGPLライセンスであり、ソースコードは以下のURLから入手できます： https://github.com/tumin-dosu/yt-date-detail

## 更新履歴

- v1.0: 初回リリース（API版）
  - YouTube Data API v3 を使用した正確な日付取得
  - キャッシュ機能
  - 非同期処理対応
- v2.3: 不具合修正　デバックモードの詳細化
  - デバックモードを追加
  - 関連動画部分に反応しない不具合を修正
- v2.4:Chrome Web Store公開版
  - セキュリティの向上とオプション画面の追加
- v2.5:ライセンスの変更
  - ライセンスなどの表示の追加

## 謝礼

- モチベーションを与えてくれる剣持と全てのにじさんじライバーの方々

## 寄付

- もし本当に役に立った！って方がいらっしゃいましたらよろしければ寄付をお願いします！

https://tumin-dosu.booth.pm/

## 免責事項

- この拡張機能をインストール・使用した時点で、以下の内容に同意したものとみなします。
  - 本拡張機能は「現状のまま」提供され、その動作や機能を一切保証しません。
  - 本拡張機能の利用は、すべて自己責任でお願いします。
  - 本拡張機能の利用によって生じたいかなる損害についても、開発者は一切責任を負いません。
  - 本拡張機能はGoogleが開発したものではなく、Google YouTubeその他企業とは何ら関係のない個人が開発したものです。
  - 本拡張機能について予告なく機能の変更や、サービスの提供の終了などが行われる可能性があります。

## Copyright & License

  - This project is licensed under the LGPL v3 - see the [LICENSE](LICENSE) file for details.

  CONTACT : tumin_sfre@outlook.com<br><br>
  ***Copyright © 2025 tumin-dosu. All rights reserved.***