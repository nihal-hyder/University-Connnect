
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "attendance_records": {
                  Row: {
                    "checked_in_at": string,"checked_in_by": string | null,"event_id": string,"id": string,"method": string,"registration_id": string,"ticket_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "checked_in_at"?: string,"checked_in_by"?: string | null,"event_id": string,"id"?: string,"method": string,"registration_id": string,"ticket_id"?: string | null
                  }
                  Update: {
                    "checked_in_at"?: string,"checked_in_by"?: string | null,"event_id"?: string,"id"?: string,"method"?: string,"registration_id"?: string,"ticket_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_records_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_records_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_records_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: true
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_records_ticket_id_fkey"
      columns: ["ticket_id"]
isOneToOne: false
      referencedRelation: "tickets"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_logs": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"entity_id": string | null,"entity_type": string,"event_id": string | null,"id": number,"society_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type": string,"event_id"?: string | null,"id"?: never,"society_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"entity_id"?: string | null,"entity_type"?: string,"event_id"?: string | null,"id"?: never,"society_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_logs_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"campuses": {
                  Row: {
                    "city_id": number | null,"created_at": string,"id": string,"is_active": boolean,"name": string,"university_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city_id"?: number | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"university_id": string
                  }
                  Update: {
                    "city_id"?: number | null,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"university_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campuses_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campuses_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"certificates": {
                  Row: {
                    "code": string,"event_date": string | null,"event_id": string,"event_title": string,"id": string,"issued_at": string,"issued_by": string | null,"issuer_name": string,"recipient_name": string,"revoked_at": string | null,"revoked_reason": string | null,"role_title": string,"society_id": string,"society_name": string,"user_id": string | null,"volunteer_application_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"event_date"?: string | null,"event_id": string,"event_title": string,"id"?: string,"issued_at"?: string,"issued_by"?: string | null,"issuer_name": string,"recipient_name": string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"role_title": string,"society_id": string,"society_name": string,"user_id"?: string | null,"volunteer_application_id"?: string | null
                  }
                  Update: {
                    "code"?: string,"event_date"?: string | null,"event_id"?: string,"event_title"?: string,"id"?: string,"issued_at"?: string,"issued_by"?: string | null,"issuer_name"?: string,"recipient_name"?: string,"revoked_at"?: string | null,"revoked_reason"?: string | null,"role_title"?: string,"society_id"?: string,"society_name"?: string,"user_id"?: string | null,"volunteer_application_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "certificates_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_issued_by_fkey"
      columns: ["issued_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "certificates_volunteer_application_id_fkey"
      columns: ["volunteer_application_id"]
isOneToOne: true
      referencedRelation: "volunteer_applications"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "created_at": string,"id": number,"is_active": boolean,"name": string,"province": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"is_active"?: boolean,"name": string,"province": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"is_active"?: boolean,"name"?: string,"province"?: string
                  }
                  Relationships: [
                    
                  ]
                },"departments": {
                  Row: {
                    "created_at": string,"id": string,"is_active": boolean,"name": string,"university_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"university_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"university_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "departments_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"email_outbox": {
                  Row: {
                    "attempts": number,"bounced_at": string | null,"category": Database["public"]['Enums']["email_category"],"complained_at": string | null,"created_at": string,"delivered_at": string | null,"id": string,"idempotency_key": string,"last_error": string | null,"locked_at": string | null,"max_attempts": number,"next_attempt_at": string,"notification_id": string | null,"payload": NonNullable<Json>,"provider_message_id": string | null,"sent_at": string | null,"status": Database["public"]['Enums']["email_status"],"subject": string,"template": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"bounced_at"?: string | null,"category": Database["public"]['Enums']["email_category"],"complained_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"idempotency_key": string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"next_attempt_at"?: string,"notification_id"?: string | null,"payload"?: NonNullable<Json>,"provider_message_id"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"subject": string,"template": string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "attempts"?: number,"bounced_at"?: string | null,"category"?: Database["public"]['Enums']["email_category"],"complained_at"?: string | null,"created_at"?: string,"delivered_at"?: string | null,"id"?: string,"idempotency_key"?: string,"last_error"?: string | null,"locked_at"?: string | null,"max_attempts"?: number,"next_attempt_at"?: string,"notification_id"?: string | null,"payload"?: NonNullable<Json>,"provider_message_id"?: string | null,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["email_status"],"subject"?: string,"template"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_outbox_notification_id_fkey"
      columns: ["notification_id"]
isOneToOne: false
      referencedRelation: "notifications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "email_outbox_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"event_announcements": {
                  Row: {
                    "audience": string,"author_id": string | null,"body": string,"created_at": string,"event_id": string,"id": string,"recipients": number,"send_email": boolean,"shift_id": string | null,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience": string,"author_id"?: string | null,"body": string,"created_at"?: string,"event_id": string,"id"?: string,"recipients"?: number,"send_email"?: boolean,"shift_id"?: string | null,"title": string
                  }
                  Update: {
                    "audience"?: string,"author_id"?: string | null,"body"?: string,"created_at"?: string,"event_id"?: string,"id"?: string,"recipients"?: number,"send_email"?: boolean,"shift_id"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_announcements_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_announcements_shift_id_fkey"
      columns: ["shift_id"]
isOneToOne: false
      referencedRelation: "volunteer_shifts"
      referencedColumns: ["id"]
    }
                  ]
                },"event_categories": {
                  Row: {
                    "description": string | null,"id": number,"is_active": boolean,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "description"?: string | null,"id"?: never,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "description"?: string | null,"id"?: never,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"event_collaborations": {
                  Row: {
                    "can_check_in": boolean,"can_edit_details": boolean,"can_manage_volunteers": boolean,"can_view_analytics": boolean,"can_view_registrations": boolean,"created_at": string,"event_id": string,"id": string,"invited_by": string | null,"message": string | null,"responded_at": string | null,"responded_by": string | null,"society_id": string,"status": Database["public"]['Enums']["collaboration_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "can_check_in"?: boolean,"can_edit_details"?: boolean,"can_manage_volunteers"?: boolean,"can_view_analytics"?: boolean,"can_view_registrations"?: boolean,"created_at"?: string,"event_id": string,"id"?: string,"invited_by"?: string | null,"message"?: string | null,"responded_at"?: string | null,"responded_by"?: string | null,"society_id": string,"status"?: Database["public"]['Enums']["collaboration_status"],"updated_at"?: string
                  }
                  Update: {
                    "can_check_in"?: boolean,"can_edit_details"?: boolean,"can_manage_volunteers"?: boolean,"can_view_analytics"?: boolean,"can_view_registrations"?: boolean,"created_at"?: string,"event_id"?: string,"id"?: string,"invited_by"?: string | null,"message"?: string | null,"responded_at"?: string | null,"responded_by"?: string | null,"society_id"?: string,"status"?: Database["public"]['Enums']["collaboration_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_collaborations_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_collaborations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_collaborations_responded_by_fkey"
      columns: ["responded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_collaborations_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    }
                  ]
                },"event_daily_visitors": {
                  Row: {
                    "day": string,"event_id": string,"visitor_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"event_id": string,"visitor_hash": string
                  }
                  Update: {
                    "day"?: string,"event_id"?: string,"visitor_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_daily_visitors_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"event_registration_starts": {
                  Row: {
                    "day": string,"event_id": string,"visitor_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "day": string,"event_id": string,"visitor_hash": string
                  }
                  Update: {
                    "day"?: string,"event_id"?: string,"visitor_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_registration_starts_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"event_target_universities": {
                  Row: {
                    "event_id": string,"university_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "event_id": string,"university_id": string
                  }
                  Update: {
                    "event_id"?: string,"university_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_target_universities_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "event_target_universities_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "accessibility_info": string | null,"agenda": NonNullable<Json>,"campus_id": string | null,"capacity": number | null,"category_id": number | null,"city_id": number | null,"confirmed_count": number,"contact_email": string | null,"contact_phone": string | null,"cover_path": string | null,"created_at": string,"created_by": string | null,"description": string | null,"eligibility_notes": string | null,"eligibility_scope": Database["public"]['Enums']["eligibility_scope"],"eligible_levels": (Database["public"]['Enums']["academic_level"])[],"ends_at": string | null,"event_type": Database["public"]['Enums']["event_type"],"external_registration_url": string | null,"fee_amount": number | null,"fee_currency": string,"fee_description": string | null,"format": Database["public"]['Enums']["event_format"],"id": string,"is_demo": boolean,"is_free": boolean,"online_url": string | null,"payment_instructions": string | null,"payment_url": string | null,"pending_count": number,"publish_at": string | null,"published_at": string | null,"refund_policy": string | null,"registration_closes_at": string | null,"registration_mode": Database["public"]['Enums']["registration_mode"],"registration_opens_at": string | null,"require_university_email": boolean,"requires_approval": boolean,"review_note": string | null,"reviewed_by": string | null,"schedule_note": string | null,"schedule_status": Database["public"]['Enums']["event_schedule_status"],"search": unknown,"slug": string,"society_id": string,"speakers": NonNullable<Json>,"starts_at": string | null,"status": Database["public"]['Enums']["event_status"],"submitted_at": string | null,"summary": string | null,"tags": (string)[],"team_max": number | null,"team_min": number | null,"terms_text": string | null,"timezone": string,"title": string,"university_id": string | null,"updated_at": string,"updated_by": string | null,"venue": string | null,"volunteer_recruitment_open": boolean,"waitlist_count": number,"waitlist_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "accessibility_info"?: string | null,"agenda"?: NonNullable<Json>,"campus_id"?: string | null,"capacity"?: number | null,"category_id"?: number | null,"city_id"?: number | null,"confirmed_count"?: number,"contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"eligibility_notes"?: string | null,"eligibility_scope"?: Database["public"]['Enums']["eligibility_scope"],"eligible_levels"?: (Database["public"]['Enums']["academic_level"])[],"ends_at"?: string | null,"event_type"?: Database["public"]['Enums']["event_type"],"external_registration_url"?: string | null,"fee_amount"?: number | null,"fee_currency"?: string,"fee_description"?: string | null,"format"?: Database["public"]['Enums']["event_format"],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"online_url"?: string | null,"payment_instructions"?: string | null,"payment_url"?: string | null,"pending_count"?: number,"publish_at"?: string | null,"published_at"?: string | null,"refund_policy"?: string | null,"registration_closes_at"?: string | null,"registration_mode"?: Database["public"]['Enums']["registration_mode"],"registration_opens_at"?: string | null,"require_university_email"?: boolean,"requires_approval"?: boolean,"review_note"?: string | null,"reviewed_by"?: string | null,"schedule_note"?: string | null,"schedule_status"?: Database["public"]['Enums']["event_schedule_status"],"search"?: unknown,"slug": string,"society_id": string,"speakers"?: NonNullable<Json>,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["event_status"],"submitted_at"?: string | null,"summary"?: string | null,"tags"?: (string)[],"team_max"?: number | null,"team_min"?: number | null,"terms_text"?: string | null,"timezone"?: string,"title": string,"university_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"venue"?: string | null,"volunteer_recruitment_open"?: boolean,"waitlist_count"?: number,"waitlist_enabled"?: boolean
                  }
                  Update: {
                    "accessibility_info"?: string | null,"agenda"?: NonNullable<Json>,"campus_id"?: string | null,"capacity"?: number | null,"category_id"?: number | null,"city_id"?: number | null,"confirmed_count"?: number,"contact_email"?: string | null,"contact_phone"?: string | null,"cover_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"eligibility_notes"?: string | null,"eligibility_scope"?: Database["public"]['Enums']["eligibility_scope"],"eligible_levels"?: (Database["public"]['Enums']["academic_level"])[],"ends_at"?: string | null,"event_type"?: Database["public"]['Enums']["event_type"],"external_registration_url"?: string | null,"fee_amount"?: number | null,"fee_currency"?: string,"fee_description"?: string | null,"format"?: Database["public"]['Enums']["event_format"],"id"?: string,"is_demo"?: boolean,"is_free"?: boolean,"online_url"?: string | null,"payment_instructions"?: string | null,"payment_url"?: string | null,"pending_count"?: number,"publish_at"?: string | null,"published_at"?: string | null,"refund_policy"?: string | null,"registration_closes_at"?: string | null,"registration_mode"?: Database["public"]['Enums']["registration_mode"],"registration_opens_at"?: string | null,"require_university_email"?: boolean,"requires_approval"?: boolean,"review_note"?: string | null,"reviewed_by"?: string | null,"schedule_note"?: string | null,"schedule_status"?: Database["public"]['Enums']["event_schedule_status"],"search"?: unknown,"slug"?: string,"society_id"?: string,"speakers"?: NonNullable<Json>,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["event_status"],"submitted_at"?: string | null,"summary"?: string | null,"tags"?: (string)[],"team_max"?: number | null,"team_min"?: number | null,"terms_text"?: string | null,"timezone"?: string,"title"?: string,"university_id"?: string | null,"updated_at"?: string,"updated_by"?: string | null,"venue"?: string | null,"volunteer_recruitment_open"?: boolean,"waitlist_count"?: number,"waitlist_enabled"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_campus_id_fkey"
      columns: ["campus_id"]
isOneToOne: false
      referencedRelation: "campuses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "event_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"form_versions": {
                  Row: {
                    "created_at": string,"created_by": string | null,"event_id": string | null,"fields": NonNullable<Json>,"id": string,"version": number,"volunteer_role_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"version": number,"volunteer_role_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"version"?: number,"volunteer_role_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "form_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "form_versions_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "form_versions_role_fk"
      columns: ["volunteer_role_id"]
isOneToOne: false
      referencedRelation: "volunteer_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"job_runs": {
                  Row: {
                    "finished_at": string | null,"id": number,"job": string,"ok": boolean | null,"started_at": string,"summary": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "finished_at"?: string | null,"id"?: never,"job": string,"ok"?: boolean | null,"started_at"?: string,"summary"?: NonNullable<Json>
                  }
                  Update: {
                    "finished_at"?: string | null,"id"?: never,"job"?: string,"ok"?: boolean | null,"started_at"?: string,"summary"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"moderation_actions": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"id": string,"note": string | null,"target_id": string | null,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"target_id"?: string | null,"target_type": string
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"id"?: string,"note"?: string | null,"target_id"?: string | null,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_actions_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"idempotency_key": string | null,"link": string | null,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key"?: string | null,"link"?: string | null,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"idempotency_key"?: string | null,"link"?: string | null,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_admins": {
                  Row: {
                    "granted_at": string,"granted_by": string | null,"note": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"granted_by"?: string | null,"note"?: string | null,"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"granted_by"?: string | null,"note"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "platform_admins_granted_by_fkey"
      columns: ["granted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "platform_admins_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_interests": {
                  Row: {
                    "category_id": number,"created_at": string,"profile_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"created_at"?: string,"profile_id": string
                  }
                  Update: {
                    "category_id"?: number,"created_at"?: string,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_interests_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "event_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profile_interests_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "academic_level": Database["public"]['Enums']["academic_level"] | null,"avatar_path": string | null,"bio": string | null,"campus_id": string | null,"city_id": number | null,"contact_email": string | null,"created_at": string,"department_id": string | null,"full_name": string,"graduation_year": number | null,"id": string,"onboarded_at": string | null,"program": string | null,"university_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "academic_level"?: Database["public"]['Enums']["academic_level"] | null,"avatar_path"?: string | null,"bio"?: string | null,"campus_id"?: string | null,"city_id"?: number | null,"contact_email"?: string | null,"created_at"?: string,"department_id"?: string | null,"full_name"?: string,"graduation_year"?: number | null,"id": string,"onboarded_at"?: string | null,"program"?: string | null,"university_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "academic_level"?: Database["public"]['Enums']["academic_level"] | null,"avatar_path"?: string | null,"bio"?: string | null,"campus_id"?: string | null,"city_id"?: number | null,"contact_email"?: string | null,"created_at"?: string,"department_id"?: string | null,"full_name"?: string,"graduation_year"?: number | null,"id"?: string,"onboarded_at"?: string | null,"program"?: string | null,"university_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_campus_id_fkey"
      columns: ["campus_id"]
isOneToOne: false
      referencedRelation: "campuses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"registration_history": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"from_status": Database["public"]['Enums']["registration_status"] | null,"id": number,"note": string | null,"registration_id": string,"to_status": Database["public"]['Enums']["registration_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["registration_status"] | null,"id"?: never,"note"?: string | null,"registration_id": string,"to_status": Database["public"]['Enums']["registration_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["registration_status"] | null,"id"?: never,"note"?: string | null,"registration_id"?: string,"to_status"?: Database["public"]['Enums']["registration_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "registration_history_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registration_history_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: false
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"registrations": {
                  Row: {
                    "answers": NonNullable<Json>,"cancel_reason": string | null,"cancelled_at": string | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"decision_note": string | null,"event_id": string,"form_version_id": string | null,"id": string,"reference_code": string,"status": Database["public"]['Enums']["registration_status"],"team_members": NonNullable<Json>,"team_name": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"event_id": string,"form_version_id"?: string | null,"id"?: string,"reference_code": string,"status": Database["public"]['Enums']["registration_status"],"team_members"?: NonNullable<Json>,"team_name"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"cancel_reason"?: string | null,"cancelled_at"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"decision_note"?: string | null,"event_id"?: string,"form_version_id"?: string | null,"id"?: string,"reference_code"?: string,"status"?: Database["public"]['Enums']["registration_status"],"team_members"?: NonNullable<Json>,"team_name"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "registrations_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "form_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "registrations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"event_id": string | null,"id": string,"profile_id": string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"society_id": string | null,"status": Database["public"]['Enums']["report_status"],"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"event_id"?: string | null,"id"?: string,"profile_id"?: string | null,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"society_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"event_id"?: string | null,"id"?: string,"profile_id"?: string | null,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"society_id"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_events": {
                  Row: {
                    "created_at": string,"event_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_events_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_events_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_opportunities": {
                  Row: {
                    "created_at": string,"role_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_opportunities_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "volunteer_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_opportunities_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"societies": {
                  Row: {
                    "application_id": string | null,"campus_id": string | null,"category_id": number | null,"created_at": string,"department_id": string | null,"description": string | null,"events_require_review": boolean,"id": string,"is_demo": boolean,"logo_path": string | null,"name": string,"public_contact_email": string | null,"scope_label": string | null,"slug": string,"social_links": NonNullable<Json>,"status": Database["public"]['Enums']["society_status"],"status_note": string | null,"university_id": string,"updated_at": string,"verified_at": string | null,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id"?: string | null,"campus_id"?: string | null,"category_id"?: number | null,"created_at"?: string,"department_id"?: string | null,"description"?: string | null,"events_require_review"?: boolean,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name": string,"public_contact_email"?: string | null,"scope_label"?: string | null,"slug": string,"social_links"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["society_status"],"status_note"?: string | null,"university_id": string,"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null
                  }
                  Update: {
                    "application_id"?: string | null,"campus_id"?: string | null,"category_id"?: number | null,"created_at"?: string,"department_id"?: string | null,"description"?: string | null,"events_require_review"?: boolean,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name"?: string,"public_contact_email"?: string | null,"scope_label"?: string | null,"slug"?: string,"social_links"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["society_status"],"status_note"?: string | null,"university_id"?: string,"updated_at"?: string,"verified_at"?: string | null,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "societies_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "society_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "societies_campus_id_fkey"
      columns: ["campus_id"]
isOneToOne: false
      referencedRelation: "campuses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "societies_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "event_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "societies_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "societies_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"society_applications": {
                  Row: {
                    "admin_message": string | null,"applicant_id": string,"applicant_role": string | null,"campus_id": string | null,"category_id": number | null,"contact_email": string | null,"contact_phone": string | null,"created_at": string,"department_id": string | null,"description": string | null,"evidence_path": string | null,"faculty_advisor_email": string | null,"faculty_advisor_name": string | null,"faculty_advisor_title": string | null,"id": string,"logo_path": string | null,"name": string,"president_email": string | null,"president_name": string | null,"public_contact_email": string | null,"recognition_details": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"scope_label": string | null,"social_links": NonNullable<Json>,"society_id": string | null,"status": Database["public"]['Enums']["society_application_status"],"submitted_at": string | null,"team_size": number | null,"university_id": string,"updated_at": string,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "admin_message"?: string | null,"applicant_id": string,"applicant_role"?: string | null,"campus_id"?: string | null,"category_id"?: number | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"department_id"?: string | null,"description"?: string | null,"evidence_path"?: string | null,"faculty_advisor_email"?: string | null,"faculty_advisor_name"?: string | null,"faculty_advisor_title"?: string | null,"id"?: string,"logo_path"?: string | null,"name": string,"president_email"?: string | null,"president_name"?: string | null,"public_contact_email"?: string | null,"recognition_details"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"scope_label"?: string | null,"social_links"?: NonNullable<Json>,"society_id"?: string | null,"status"?: Database["public"]['Enums']["society_application_status"],"submitted_at"?: string | null,"team_size"?: number | null,"university_id": string,"updated_at"?: string,"website_url"?: string | null
                  }
                  Update: {
                    "admin_message"?: string | null,"applicant_id"?: string,"applicant_role"?: string | null,"campus_id"?: string | null,"category_id"?: number | null,"contact_email"?: string | null,"contact_phone"?: string | null,"created_at"?: string,"department_id"?: string | null,"description"?: string | null,"evidence_path"?: string | null,"faculty_advisor_email"?: string | null,"faculty_advisor_name"?: string | null,"faculty_advisor_title"?: string | null,"id"?: string,"logo_path"?: string | null,"name"?: string,"president_email"?: string | null,"president_name"?: string | null,"public_contact_email"?: string | null,"recognition_details"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"scope_label"?: string | null,"social_links"?: NonNullable<Json>,"society_id"?: string | null,"status"?: Database["public"]['Enums']["society_application_status"],"submitted_at"?: string | null,"team_size"?: number | null,"university_id"?: string,"updated_at"?: string,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "society_applications_applicant_id_fkey"
      columns: ["applicant_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_campus_id_fkey"
      columns: ["campus_id"]
isOneToOne: false
      referencedRelation: "campuses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "event_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_department_id_fkey"
      columns: ["department_id"]
isOneToOne: false
      referencedRelation: "departments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_society_fk"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_applications_university_id_fkey"
      columns: ["university_id"]
isOneToOne: false
      referencedRelation: "universities"
      referencedColumns: ["id"]
    }
                  ]
                },"society_invitations": {
                  Row: {
                    "created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string | null,"responded_at": string | null,"role": Database["public"]['Enums']["society_role"],"society_id": string,"status": Database["public"]['Enums']["invitation_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"responded_at"?: string | null,"role": Database["public"]['Enums']["society_role"],"society_id": string,"status"?: Database["public"]['Enums']["invitation_status"]
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string | null,"responded_at"?: string | null,"role"?: Database["public"]['Enums']["society_role"],"society_id"?: string,"status"?: Database["public"]['Enums']["invitation_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "society_invitations_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_invitations_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    }
                  ]
                },"society_memberships": {
                  Row: {
                    "created_at": string,"id": string,"role": Database["public"]['Enums']["society_role"],"society_id": string,"title": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"role": Database["public"]['Enums']["society_role"],"society_id": string,"title"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"role"?: Database["public"]['Enums']["society_role"],"society_id"?: string,"title"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "society_memberships_society_id_fkey"
      columns: ["society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "society_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tickets": {
                  Row: {
                    "code": string,"event_id": string,"id": string,"issued_at": string,"registration_id": string,"revoked_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"event_id": string,"id"?: string,"issued_at"?: string,"registration_id": string,"revoked_at"?: string | null
                  }
                  Update: {
                    "code"?: string,"event_id"?: string,"id"?: string,"issued_at"?: string,"registration_id"?: string,"revoked_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tickets_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tickets_registration_id_fkey"
      columns: ["registration_id"]
isOneToOne: true
      referencedRelation: "registrations"
      referencedColumns: ["id"]
    }
                  ]
                },"universities": {
                  Row: {
                    "city_id": number | null,"created_at": string,"email_domains": (string)[],"id": string,"is_active": boolean,"name": string,"short_name": string | null,"slug": string,"updated_at": string,"website_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "city_id"?: number | null,"created_at"?: string,"email_domains"?: (string)[],"id"?: string,"is_active"?: boolean,"name": string,"short_name"?: string | null,"slug": string,"updated_at"?: string,"website_url"?: string | null
                  }
                  Update: {
                    "city_id"?: number | null,"created_at"?: string,"email_domains"?: (string)[],"id"?: string,"is_active"?: boolean,"name"?: string,"short_name"?: string | null,"slug"?: string,"updated_at"?: string,"website_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "universities_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"user_preferences": {
                  Row: {
                    "email_recommendations": boolean,"email_reminders": boolean,"email_society_updates": boolean,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "email_recommendations"?: boolean,"email_reminders"?: boolean,"email_society_updates"?: boolean,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "email_recommendations"?: boolean,"email_reminders"?: boolean,"email_society_updates"?: boolean,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_preferences_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_application_notes": {
                  Row: {
                    "application_id": string,"author_id": string | null,"body": string,"created_at": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"author_id"?: string | null,"body": string,"created_at"?: string,"id"?: string
                  }
                  Update: {
                    "application_id"?: string,"author_id"?: string | null,"body"?: string,"created_at"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_application_notes_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "volunteer_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_application_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_applications": {
                  Row: {
                    "answers": NonNullable<Json>,"completed_at": string | null,"created_at": string,"event_id": string,"form_version_id": string | null,"id": string,"last_status_message": string | null,"offer_expires_at": string | null,"offer_message": string | null,"offered_at": string | null,"portfolio_url": string | null,"reference_code": string,"responded_at": string | null,"role_id": string,"status": Database["public"]['Enums']["volunteer_application_status"],"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"completed_at"?: string | null,"created_at"?: string,"event_id": string,"form_version_id"?: string | null,"id"?: string,"last_status_message"?: string | null,"offer_expires_at"?: string | null,"offer_message"?: string | null,"offered_at"?: string | null,"portfolio_url"?: string | null,"reference_code": string,"responded_at"?: string | null,"role_id": string,"status"?: Database["public"]['Enums']["volunteer_application_status"],"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"completed_at"?: string | null,"created_at"?: string,"event_id"?: string,"form_version_id"?: string | null,"id"?: string,"last_status_message"?: string | null,"offer_expires_at"?: string | null,"offer_message"?: string | null,"offered_at"?: string | null,"portfolio_url"?: string | null,"reference_code"?: string,"responded_at"?: string | null,"role_id"?: string,"status"?: Database["public"]['Enums']["volunteer_application_status"],"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_applications_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_applications_form_version_id_fkey"
      columns: ["form_version_id"]
isOneToOne: false
      referencedRelation: "form_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_applications_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "volunteer_roles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_applications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_roles": {
                  Row: {
                    "accepted_count": number,"application_count": number,"application_deadline": string | null,"assigned_society_id": string | null,"benefits": string | null,"compensation_details": string | null,"created_at": string,"created_by": string | null,"description": string | null,"eligibility": string | null,"event_id": string,"experience_level": Database["public"]['Enums']["experience_level"],"id": string,"is_paid": boolean,"positions": number,"requires_event_registration": boolean,"responsibilities": string | null,"schedule_notes": string | null,"selection_process": string | null,"skills": (string)[],"sort_order": number,"status": Database["public"]['Enums']["volunteer_role_status"],"time_commitment": string | null,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_count"?: number,"application_count"?: number,"application_deadline"?: string | null,"assigned_society_id"?: string | null,"benefits"?: string | null,"compensation_details"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"eligibility"?: string | null,"event_id": string,"experience_level"?: Database["public"]['Enums']["experience_level"],"id"?: string,"is_paid"?: boolean,"positions": number,"requires_event_registration"?: boolean,"responsibilities"?: string | null,"schedule_notes"?: string | null,"selection_process"?: string | null,"skills"?: (string)[],"sort_order"?: number,"status"?: Database["public"]['Enums']["volunteer_role_status"],"time_commitment"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "accepted_count"?: number,"application_count"?: number,"application_deadline"?: string | null,"assigned_society_id"?: string | null,"benefits"?: string | null,"compensation_details"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"eligibility"?: string | null,"event_id"?: string,"experience_level"?: Database["public"]['Enums']["experience_level"],"id"?: string,"is_paid"?: boolean,"positions"?: number,"requires_event_registration"?: boolean,"responsibilities"?: string | null,"schedule_notes"?: string | null,"selection_process"?: string | null,"skills"?: (string)[],"sort_order"?: number,"status"?: Database["public"]['Enums']["volunteer_role_status"],"time_commitment"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_roles_assigned_society_id_fkey"
      columns: ["assigned_society_id"]
isOneToOne: false
      referencedRelation: "societies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_roles_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_roles_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_shift_assignments": {
                  Row: {
                    "application_id": string,"assigned_by": string | null,"created_at": string,"shift_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "application_id": string,"assigned_by"?: string | null,"created_at"?: string,"shift_id": string
                  }
                  Update: {
                    "application_id"?: string,"assigned_by"?: string | null,"created_at"?: string,"shift_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_shift_assignments_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "volunteer_applications"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_shift_assignments_assigned_by_fkey"
      columns: ["assigned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_shift_assignments_shift_id_fkey"
      columns: ["shift_id"]
isOneToOne: false
      referencedRelation: "volunteer_shifts"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_shifts": {
                  Row: {
                    "capacity": number | null,"created_at": string,"ends_at": string,"event_id": string,"id": string,"instructions": string | null,"location": string | null,"role_id": string,"starts_at": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number | null,"created_at"?: string,"ends_at": string,"event_id": string,"id"?: string,"instructions"?: string | null,"location"?: string | null,"role_id": string,"starts_at": string,"title": string
                  }
                  Update: {
                    "capacity"?: number | null,"created_at"?: string,"ends_at"?: string,"event_id"?: string,"id"?: string,"instructions"?: string | null,"location"?: string | null,"role_id"?: string,"starts_at"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_shifts_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_shifts_role_id_fkey"
      columns: ["role_id"]
isOneToOne: false
      referencedRelation: "volunteer_roles"
      referencedColumns: ["id"]
    }
                  ]
                },"volunteer_status_history": {
                  Row: {
                    "actor_id": string | null,"application_id": string,"created_at": string,"from_status": Database["public"]['Enums']["volunteer_application_status"] | null,"id": number,"message": string | null,"to_status": Database["public"]['Enums']["volunteer_application_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"application_id": string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["volunteer_application_status"] | null,"id"?: never,"message"?: string | null,"to_status": Database["public"]['Enums']["volunteer_application_status"]
                  }
                  Update: {
                    "actor_id"?: string | null,"application_id"?: string,"created_at"?: string,"from_status"?: Database["public"]['Enums']["volunteer_application_status"] | null,"id"?: never,"message"?: string | null,"to_status"?: Database["public"]['Enums']["volunteer_application_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "volunteer_status_history_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "volunteer_status_history_application_id_fkey"
      columns: ["application_id"]
isOneToOne: false
      referencedRelation: "volunteer_applications"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_platform_metrics":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_review_event":
{ Args: { "p_decision": Database["public"]['Enums']["event_status"],"p_event": string,"p_note"?: string }; Returns: undefined
                           },
"admin_review_society_application":
{ Args: { "p_application": string,"p_decision": Database["public"]['Enums']["society_application_status"],"p_message"?: string }; Returns: string
                           },
"admin_set_maintenance":
{ Args: { "p_enabled": boolean,"p_message"?: string }; Returns: undefined
                           },
"admin_set_society_review_policy":
{ Args: { "p_requires_review": boolean,"p_society": string }; Returns: undefined
                           },
"admin_set_society_status":
{ Args: { "p_note": string,"p_society": string,"p_status": Database["public"]['Enums']["society_status"] }; Returns: undefined
                           },
"admin_update_report":
{ Args: { "p_note"?: string,"p_report": string,"p_status": Database["public"]['Enums']["report_status"] }; Returns: undefined
                           },
"apply_for_volunteer_role":
{ Args: { "p_answers"?: Json,"p_portfolio_url"?: string,"p_role": string }; Returns: {
              "application_id": string,"reference": string
            }[]
                           },
"cancel_registration":
{ Args: { "p_reason"?: string,"p_registration": string }; Returns: undefined
                           },
"check_in_ticket":
{ Args: { "p_code": string,"p_event": string }; Returns: Json
                           },
"duplicate_event":
{ Args: { "p_event": string }; Returns: string
                           },
"event_analytics":
{ Args: { "p_event": string }; Returns: Json
                           },
"event_funnel":
{ Args: { "p_event": string }; Returns: Json
                           },
"event_private_details":
{ Args: { "p_event": string }; Returns: Json
                           },
"get_site_status":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"invite_collaborator":
{ Args: { "p_can_check_in"?: boolean,"p_can_edit_details"?: boolean,"p_can_manage_volunteers"?: boolean,"p_can_view_analytics"?: boolean,"p_can_view_registrations"?: boolean,"p_event": string,"p_message"?: string,"p_society": string }; Returns: string
                           },
"invite_society_member":
{ Args: { "p_email": string,"p_role": Database["public"]['Enums']["society_role"],"p_society": string }; Returns: string
                           },
"issue_volunteer_certificate":
{ Args: { "p_application": string }; Returns: string
                           },
"job_claim_emails":
{ Args: { "p_limit"?: number }; Returns: {
              "attempts": number,"category": Database["public"]['Enums']["email_category"],"id": string,"payload": Json,"subject": string,"template": string,"to_email": string
            }[]
                           },
"job_complete_email":
{ Args: { "p_error"?: string,"p_id": string,"p_provider_id"?: string,"p_status": Database["public"]['Enums']["email_status"] }; Returns: undefined
                           },
"job_enqueue_reminders":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"job_record_email_event":
{ Args: { "p_at"?: string,"p_event": string,"p_provider_id": string }; Returns: boolean
                           },
"manual_check_in":
{ Args: { "p_registration": string,"p_undo"?: boolean }; Returns: Json
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"organizer_set_registration_status":
{ Args: { "p_note"?: string,"p_registration": string,"p_status": Database["public"]['Enums']["registration_status"] }; Returns: undefined
                           },
"organizer_update_volunteer_application":
{ Args: { "p_application": string,"p_message"?: string,"p_offer_expires_at"?: string,"p_status": Database["public"]['Enums']["volunteer_application_status"] }; Returns: undefined
                           },
"record_event_view":
{ Args: { "p_event": string,"p_visitor_hash": string }; Returns: undefined
                           },
"record_registration_start":
{ Args: { "p_event": string,"p_visitor_hash": string }; Returns: undefined
                           },
"register_for_event":
{ Args: { "p_answers"?: Json,"p_event": string,"p_team_members"?: Json,"p_team_name"?: string }; Returns: {
              "reference": string,"registration_id": string,"registration_status": Database["public"]['Enums']["registration_status"]
            }[]
                           },
"remove_society_member":
{ Args: { "p_membership": string }; Returns: undefined
                           },
"respond_collaboration":
{ Args: { "p_accept": boolean,"p_collaboration": string }; Returns: undefined
                           },
"respond_society_invitation":
{ Args: { "p_accept": boolean,"p_invitation": string }; Returns: string
                           },
"respond_volunteer_offer":
{ Args: { "p_accept": boolean,"p_application": string }; Returns: undefined
                           },
"revoke_certificate":
{ Args: { "p_certificate": string,"p_reason": string }; Returns: undefined
                           },
"revoke_collaboration":
{ Args: { "p_collaboration": string }; Returns: undefined
                           },
"revoke_society_invitation":
{ Args: { "p_invitation": string }; Returns: undefined
                           },
"save_form":
{ Args: { "p_event": string,"p_fields": Json,"p_role": string }; Returns: string
                           },
"search_events":
{ Args: { "p_campus"?: string,"p_category"?: string,"p_city"?: number,"p_eligible_for"?: string,"p_format"?: Database["public"]['Enums']["event_format"],"p_free"?: boolean,"p_from"?: string,"p_include_past"?: boolean,"p_limit"?: number,"p_offset"?: number,"p_open_only"?: boolean,"p_q"?: string,"p_scope"?: Database["public"]['Enums']["eligibility_scope"],"p_society"?: string,"p_sort"?: string,"p_to"?: string,"p_type"?: Database["public"]['Enums']["event_type"],"p_university"?: string,"p_volunteering"?: boolean }; Returns: {
              "capacity": number,"category_name": string,"category_slug": string,"city_name": string,"confirmed_count": number,"cover_path": string,"eligibility_scope": Database["public"]['Enums']["eligibility_scope"],"ends_at": string,"event_type": Database["public"]['Enums']["event_type"],"fee_amount": number,"fee_currency": string,"format": Database["public"]['Enums']["event_format"],"id": string,"is_demo": boolean,"is_free": boolean,"open_roles": number,"registration_closes_at": string,"registration_mode": Database["public"]['Enums']["registration_mode"],"registration_opens_at": string,"schedule_status": Database["public"]['Enums']["event_schedule_status"],"slug": string,"society_logo": string,"society_name": string,"society_slug": string,"starts_at": string,"summary": string,"timezone": string,"title": string,"total_count": number,"university_name": string,"university_short": string,"venue": string,"volunteer_recruitment_open": boolean,"waitlist_enabled": boolean
            }[]
                           },
"send_event_announcement":
{ Args: { "p_audience": string,"p_body": string,"p_event": string,"p_send_email"?: boolean,"p_shift"?: string,"p_title": string }; Returns: number
                           },
"set_event_schedule_status":
{ Args: { "p_event": string,"p_note"?: string,"p_status": Database["public"]['Enums']["event_schedule_status"] }; Returns: undefined
                           },
"society_analytics":
{ Args: { "p_from": string,"p_society": string,"p_to": string }; Returns: Json
                           },
"society_registration_starts":
{ Args: { "p_from": string,"p_society": string,"p_to": string }; Returns: number
                           },
"submit_event":
{ Args: { "p_event": string }; Returns: Database["public"]['Enums']["event_status"]
                           },
"submit_report":
{ Args: { "p_details"?: string,"p_reason": Database["public"]['Enums']["report_reason"],"p_target": Database["public"]['Enums']["report_target"],"p_target_id": string }; Returns: string
                           },
"submit_society_application":
{ Args: { "p_application": string }; Returns: Database["public"]['Enums']["society_application_status"]
                           },
"transfer_society_ownership":
{ Args: { "p_new_owner": string,"p_society": string }; Returns: undefined
                           },
"update_collaboration_permissions":
{ Args: { "p_can_check_in": boolean,"p_can_edit_details": boolean,"p_can_manage_volunteers": boolean,"p_can_view_analytics": boolean,"p_can_view_registrations": boolean,"p_collaboration": string }; Returns: undefined
                           },
"update_society_member_role":
{ Args: { "p_membership": string,"p_role": Database["public"]['Enums']["society_role"],"p_title"?: string }; Returns: undefined
                           },
"verify_certificate":
{ Args: { "p_code": string }; Returns: {
              "event_date": string,"event_title": string,"issued_at": string,"issuer_name": string,"recipient_name": string,"revoked": boolean,"role_title": string,"society_name": string
            }[]
                           },
"withdraw_event_submission":
{ Args: { "p_event": string }; Returns: undefined
                           },
"withdraw_volunteer_application":
{ Args: { "p_application": string }; Returns: undefined
                           }
          }
          Enums: {
            "academic_level": "undergraduate"|"masters"|"phd"|"diploma"|"other","collaboration_status": "pending"|"accepted"|"declined"|"revoked","eligibility_scope": "open"|"host_university"|"selected_universities","email_category": "transactional"|"reminder"|"promotional","email_status": "queued"|"sending"|"sent"|"failed"|"skipped"|"logged_dev"|"delivered"|"bounced"|"complained","event_format": "in_person"|"online"|"hybrid","event_schedule_status": "scheduled"|"postponed"|"cancelled","event_status": "draft"|"pending_review"|"changes_requested"|"rejected"|"published"|"archived","event_type": "hackathon"|"competition"|"workshop"|"seminar"|"conference"|"webinar"|"festival"|"debate"|"mun"|"sports"|"cultural"|"career_fair"|"networking"|"other","experience_level": "none"|"some"|"experienced","invitation_status": "pending"|"accepted"|"declined"|"revoked"|"expired","registration_mode": "none"|"individual"|"team"|"external","registration_status": "pending"|"confirmed"|"waitlisted"|"rejected"|"cancelled","report_reason": "fraudulent_event"|"impersonation"|"misleading_fees"|"spam"|"inappropriate_content"|"misuse_of_data"|"other","report_status": "open"|"reviewing"|"resolved"|"dismissed","report_target": "event"|"society"|"profile","society_application_status": "draft"|"submitted"|"under_review"|"info_requested"|"approved"|"rejected","society_role": "owner"|"admin"|"event_manager"|"volunteer_coordinator"|"analyst","society_status": "active"|"suspended","volunteer_application_status": "submitted"|"under_review"|"shortlisted"|"interview_requested"|"offered"|"accepted"|"declined"|"waitlisted"|"rejected"|"withdrawn"|"completed","volunteer_role_status": "open"|"paused"|"closed"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "academic_level": ["undergraduate", "masters", "phd", "diploma", "other"],"collaboration_status": ["pending", "accepted", "declined", "revoked"],"eligibility_scope": ["open", "host_university", "selected_universities"],"email_category": ["transactional", "reminder", "promotional"],"email_status": ["queued", "sending", "sent", "failed", "skipped", "logged_dev", "delivered", "bounced", "complained"],"event_format": ["in_person", "online", "hybrid"],"event_schedule_status": ["scheduled", "postponed", "cancelled"],"event_status": ["draft", "pending_review", "changes_requested", "rejected", "published", "archived"],"event_type": ["hackathon", "competition", "workshop", "seminar", "conference", "webinar", "festival", "debate", "mun", "sports", "cultural", "career_fair", "networking", "other"],"experience_level": ["none", "some", "experienced"],"invitation_status": ["pending", "accepted", "declined", "revoked", "expired"],"registration_mode": ["none", "individual", "team", "external"],"registration_status": ["pending", "confirmed", "waitlisted", "rejected", "cancelled"],"report_reason": ["fraudulent_event", "impersonation", "misleading_fees", "spam", "inappropriate_content", "misuse_of_data", "other"],"report_status": ["open", "reviewing", "resolved", "dismissed"],"report_target": ["event", "society", "profile"],"society_application_status": ["draft", "submitted", "under_review", "info_requested", "approved", "rejected"],"society_role": ["owner", "admin", "event_manager", "volunteer_coordinator", "analyst"],"society_status": ["active", "suspended"],"volunteer_application_status": ["submitted", "under_review", "shortlisted", "interview_requested", "offered", "accepted", "declined", "waitlisted", "rejected", "withdrawn", "completed"],"volunteer_role_status": ["open", "paused", "closed"]
          }
        }
} as const
