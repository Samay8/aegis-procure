import type { LucideIcon } from "lucide-react";
import {
  BadgeIndianRupee,
  Banknote,
  Bell,
  Building,
  ChartColumn,
  ClipboardCheck,
  Coins,
  Database,
  FileText,
  Gavel,
  IdCard,
  Landmark,
  Layers,
  MapPin,
  Network,
  Phone,
  ScrollText,
  Split,
  Timer,
  UserRound,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import type { EntityKind, EvidenceGroup, NotificationKind, SignalCategory } from "@/types";

export const CATEGORY_ICON: Record<SignalCategory, LucideIcon> = {
  PRICE: BadgeIndianRupee,
  BID_BEHAVIOR: Gavel,
  AWARD_CONCENTRATION: Layers,
  VENDOR_RELATIONSHIP: Network,
  TIMING: Timer,
  CONTRACT: Split,
  PAYMENT: Wallet,
  PARTICIPATION: Users,
};

export const ENTITY_ICON: Record<EntityKind, LucideIcon> = {
  VENDOR: Building,
  TENDER: FileText,
  CONTRACT: ScrollText,
  DEPARTMENT: Landmark,
  DIRECTOR: UserRound,
  ADDRESS: MapPin,
  BANK_ACCOUNT: Banknote,
  CONTACT: Phone,
  OWNER: Coins,
  REGISTRATION: IdCard,
};

export const EVIDENCE_ICON: Record<EvidenceGroup, LucideIcon> = {
  PROCUREMENT: FileText,
  BIDS: Gavel,
  VENDOR: Building,
  CONTRACT: ScrollText,
  PAYMENT: Wallet,
  RELATIONSHIP: Network,
  COMPARABLE: ChartColumn,
};

export const NOTIFICATION_ICON: Record<NotificationKind, LucideIcon> = {
  SIGNAL: Zap,
  ASSIGNMENT: ClipboardCheck,
  DATA: Database,
  REVIEW: Bell,
  ANALYSIS: ChartColumn,
};
