CREATE TABLE IF NOT EXISTS external_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    sender_account_id UUID NOT NULL
        REFERENCES accounts(id),

    bank_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,

    recipient_account_number VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(150) NOT NULL,

    amount NUMERIC(15,2) NOT NULL,
    fee NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL,

    currency VARCHAR(10) NOT NULL DEFAULT 'NGN',

    description VARCHAR(255),

    reference VARCHAR(100) NOT NULL UNIQUE,

    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_external_transfers_sender
ON external_transfers(sender_account_id);

CREATE INDEX IF NOT EXISTS idx_external_transfers_reference
ON external_transfers(reference);

CREATE INDEX IF NOT EXISTS idx_external_transfers_created_at
ON external_transfers(created_at DESC);
