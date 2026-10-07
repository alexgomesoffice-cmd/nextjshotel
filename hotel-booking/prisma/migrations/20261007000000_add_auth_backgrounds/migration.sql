CREATE TYPE "AuthBackgroundKind" AS ENUM ('LOGIN', 'REGISTRATION');

CREATE TABLE "auth_backgrounds" (
    "id" SERIAL PRIMARY KEY,
    "kind" "AuthBackgroundKind" NOT NULL,
    "image_url" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "auth_backgrounds_kind_key"
    ON "auth_backgrounds"("kind");
