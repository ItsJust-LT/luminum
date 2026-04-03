package main

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

// websiteExists reports whether a row exists in websites for this UUID (primary key only).
func websiteExists(ctx context.Context, normalizedUUID string) (ok bool, err error) {
	var one int
	e := dbPool.QueryRow(ctx, `SELECT 1 FROM websites WHERE id = $1::uuid LIMIT 1`, normalizedUUID).Scan(&one)
	if errors.Is(e, pgx.ErrNoRows) {
		return false, nil
	}
	if e != nil {
		return false, e
	}
	return true, nil
}
